const assert = require('node:assert/strict');
const { setTimeout: wait } = require('node:timers/promises');
const test = require('node:test');
const { createServer } = require('node:http');
const { preset, buildScript, endpoints, pacing, loadStages } = require('../lib/test-lab/performance.ts');
const { activeUsers, simulate, model } = require('../lib/test-lab/performance-simulation.ts');
const { summarize, report, comparable, validConfiguration, simulationObservations } = require('../lib/test-lab/performance-run.ts');
const { createGate, runHttp } = require('../lib/test-lab/performance-http.ts');
const { buildPerformanceExportFilename, exportCsv, exportJson } = require('../lib/test-lab/performance-export.ts');
const route = require('../app/api/test-lab/performance/route.ts');

test('export filenames use the run settings, UTC start and stable scenario slugs', () => {
  const durations = { smoke: 15, load: 30, stress: 60, spike: 30, soak: 300, custom: 15 };
  for (const [scenario, duration] of Object.entries(durations)) {
    const run = { configuration: { ...preset(scenario), duration, vus: 50 }, startedAt: '2026-11-25T21:38:50.102-03:00' };
    const expected = `performance-${scenario}-test-50vus-${duration}s-2026-11-26-003850`;
    assert.equal(buildPerformanceExportFilename(run, 'json'), expected + '.json');
    assert.equal(buildPerformanceExportFilename(run, 'csv'), expected + '.csv');
  }
});

test('performance metrics use weighted nearest rank and preserve missing latency', () => {
  const sample = (count, latency, ok, checked) => ({ count, latency, ok, checked, status: ok ? 200 : null });
  const m = summarize([sample(9, 20, true, false), sample(1, 80, true, true), sample(2, null, false, false)], 4);
  assert.equal(m.requests, 12);
  assert.equal(m.throughput, 3);
  assert.equal(m.errors, 2 / 12 * 100);
  assert.equal(m.average, 26);
  assert.deepEqual([m.p50, m.p90, m.p95, m.p99], [20, 20, 80, 80]);
  assert.equal(m.checksPassed, 1);
  assert.equal(summarize([], 0).p99, null);
  const global = report({ configuration: preset('load'), elapsed: 2, status: 'completed', intervals: [
    { time: 1, vus: 10, samples: [sample(99, 50, true, true)] },
    { time: 2, vus: 10, samples: [sample(1, 700, true, true)] },
  ] });
  assert.equal(global.p95, 50);
  assert.equal(global.p99, 50);
  assert.equal(global.max, 700);
});

test('simulation is repeatable, bounded and produces different load profiles', () => {
  for (const name of ['smoke', 'load', 'stress', 'spike', 'soak', 'custom']) {
    const c = preset(name);
    const points = [...simulate(c)];
    assert.deepEqual(points, [...simulate(c)]);
    assert.equal(points.length, 24);
    assert.equal(points.at(-1).time, c.duration);
    assert(points.every(p => p.samples.length <= 221 && p.vus <= c.vus));
  }
  const spike = preset('spike');
  assert(activeUsers(spike, 12) > activeUsers(spike, 1));
  assert.equal(activeUsers(spike, 1), activeUsers(spike, 28));
});

test('100 constant VUs meet the original thresholds on both endpoints with multiple seeds', () => {
  for (const endpoint of endpoints) {
    for (const seed of [1729, 42, 2026, 7, 619]) {
      const configuration = { ...preset('load'), endpoint, vus: 100 };
      const intervals = [...simulate(configuration, seed)];
      const run = { configuration, intervals, status: 'completed', elapsed: 30 };
      const m = report(run);
      assert.equal(m.result, 'pass');
      assert.equal(m.peak, 100);
      assert(intervals.every(point => point.vus === 100));
      assert(m.p95 <= 300 && m.p99 <= 450 && m.errors < 1);
      assert.equal(m.throughput, m.requests / 30);
      assert.equal(m.successfulThroughput, m.succeeded / 30);
      assert.equal(m.errors, m.failed / m.requests * 100);
      assert(m.throughput <= configuration.vus / pacing(configuration));
      assert.equal(JSON.parse(exportJson(run, [])).configuration.endpoint, endpoint);
      assert(exportCsv(run).includes('"' + endpoint + '"'));
      assert.deepEqual([...simulate({ ...configuration, thresholds: { ...configuration.thresholds, p95: 0 } }, seed)], intervals);
      assert.notDeepEqual([...simulate(configuration, seed + 1)], intervals);
    }
  }
});

test('overload fails without losing requests and the spike queue recovers before the run stops', () => {
  for (const scenario of ['stress', 'spike']) {
    const configuration = { ...preset(scenario), vus: 100 };
    const intervals = [...simulate(configuration)];
    let pending = 0;
    let previousTime = 0;
    for (const interval of intervals) {
      const d = interval.diagnostics;
      assert.equal(d.arrived + pending, d.completed + d.rejected + d.timedOut + d.cancelled + d.queued + d.inService);
      assert.equal(interval.samples.reduce((sum, s) => sum + s.count, 0), d.completed + d.rejected + d.timedOut);
      assert.equal(interval.samples.filter(s => s.status === 503).reduce((sum, s) => sum + s.count, 0), d.rejected);
      assert(d.queued >= 0 && d.peakQueue <= model.queueLimit && d.inService <= model.slots);
      const windowMs = (interval.time - previousTime) * 1000;
      assert(d.busySlotMs >= 0 && d.busySlotMs <= windowMs * model.slots + 1e-6);
      pending = d.queued + d.inService;
      previousTime = interval.time;
    }
    assert.equal(pending, 0);
    const m = report({ configuration, intervals, status: 'completed', elapsed: configuration.duration });
    assert.equal(m.result, 'fail');
    assert(m.p99 >= m.p95 && m.p95 >= m.p90 && m.p90 >= m.p50);
    assert(intervals.some(point => point.diagnostics.peakQueue === model.queueLimit));
    if (scenario === 'spike') {
      assert.deepEqual(simulationObservations(intervals.slice(0, -1)), { pressured: true, recovered: true });
    }
  }
});

test('simulation load stages and think time match generated k6 options', () => {
  for (const scenario of ['load', 'stress', 'spike', 'soak']) {
    const configuration = preset(scenario);
    const script = buildScript(configuration, '');
    assert(script.includes('sleep(' + pacing(configuration) + ')'));
    if (configuration.profile === 'constant' || configuration.profile === 'sustained') {
      assert(script.includes('constant-vus'));
      assert.equal(activeUsers(configuration, 0), configuration.vus);
      assert.equal(activeUsers(configuration, configuration.duration), configuration.vus);
    } else {
      const options = JSON.parse(script.split('export const options = ')[1].split(';')[0]);
      let elapsed = 0;
      for (const [index, stage] of loadStages(configuration).entries()) {
        elapsed += stage.seconds;
        assert.equal(activeUsers(configuration, elapsed), stage.target);
        assert.deepEqual(options.scenarios[scenario].stages[index], { duration: stage.seconds + 's', target: stage.target });
      }
      assert.equal(elapsed, configuration.duration);
    }
  }
});

test('strict threshold equality, partial results, comparison and CSV safety', () => {
  const configuration = preset('smoke');
  const run = { id: '=SUM(1+1)', mode: 'simulation', configuration, status: 'completed', elapsed: 1, logs: [],
    intervals: [{ time: 1, vus: 1, samples: [{ count: 30, latency: 500, ok: true, checked: true, status: 200 }] }] };
  assert.equal(report(run).result, 'fail');
  assert.equal(report({ ...run, status: 'interrupted' }).result, 'inconclusive');
  assert.equal(report({ ...run, intervals: [], elapsed: 0 }).result, 'inconclusive');
  assert(comparable(run, { ...run }));
  assert(!comparable(run, { ...run, mode: 'http' }));
  assert(exportCsv(run).includes("'=SUM(1+1)"));
  assert(buildScript(preset('spike'), '').includes('ramping-vus'));
});

test('HTTP gate rejects concurrent and too-frequent starts and validates allowlist', async () => {
  let now = 0;
  const gate = createGate(() => now);
  const release = gate();
  assert.equal(typeof release, 'function');
  assert.equal(gate(), 'busy');
  release();
  assert.equal(gate(), 'cooldown');
  now = 30000;
  assert.equal(typeof gate(), 'function');
  assert(validConfiguration(preset('smoke'), 'http'));
  assert(!validConfiguration(preset('load'), 'http'));
  assert(!validConfiguration({ ...preset('smoke'), endpoint: 'https://example.test' }, 'http'));
  assert(!validConfiguration({ ...preset('smoke'), vus: 4 }, 'http'));
  const unavailable = await route.POST(new Request('http://localhost:3000/api/test-lab/performance', { method: 'POST' }));
  assert.equal(unavailable.status, 403);
});

test('HTTP engine measures fixed GET probes, separates functional checks and aborts promptly', async () => {
  const abort = new AbortController();
  const intervals = [];
  const issued = [];
  const request = async (url, options) => {
    issued.push({ url, options, time: performance.now() });
    return Response.json({});
  };
  const work = runHttp(preset('smoke'), 'http://127.0.0.1:3000', abort.signal, interval => intervals.push(interval), request);
  const rejection = assert.rejects(work, { name: 'AbortError' });
  try {
    while (!intervals.length) await wait(25);
  } finally { abort.abort(); }
  await rejection;
  assert(issued.length >= 2);
  assert(issued.every(call => call.url === 'http://127.0.0.1:3000/api/test-lab/performance?fixture=customers'
    && call.options.method === 'GET' && call.options.redirect === 'error'));
  assert(issued.slice(1).every((call, index) => call.time - issued[index].time >= 490));
  assert(intervals[0].samples.every(sample => sample.ok && !sample.checked && sample.status === 200));
  const count = issued.length;
  await wait(30);
  assert.equal(issued.length, count);
});

test('local HTTP route streams a real loopback measurement and enforces the global gate', async () => {
  const keys = ['NODE_ENV', 'LAB_PERFORMANCE_LOCAL', 'LAB_PERFORMANCE_PORT'];
  const previous = keys.map(key => process.env[key]);
  const server = createServer(async (request, response) => {
    const probe = route.GET(new Request('http://127.0.0.1' + request.url));
    response.writeHead(probe.status, { 'Content-Type': 'application/json' });
    response.end(await probe.text());
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const makeRequest = configuration => new Request(origin + '/api/test-lab/performance', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(configuration),
  });
  let reader;
  try {
    process.env.NODE_ENV = 'development';
    process.env.LAB_PERFORMANCE_LOCAL = '1';
    process.env.LAB_PERFORMANCE_PORT = String(server.address().port);
    assert.equal((await route.POST(makeRequest({ ...preset('smoke'), endpoint: 'http://127.0.0.1:1' }))).status, 400);
    const run = await route.POST(makeRequest(preset('smoke')));
    assert.equal(run.status, 200);
    assert.equal((await (await route.POST(makeRequest(preset('smoke')))).json()).error, 'busy');
    reader = run.body.getReader();
    const { value } = await reader.read();
    const { interval } = JSON.parse(new TextDecoder().decode(value));
    assert(interval.samples.length > 0);
    assert(interval.samples.every(sample => sample.status === 200 && sample.checked && sample.latency >= 0));
    await reader.cancel();
    await wait(30);
    assert.equal((await (await route.POST(makeRequest(preset('smoke')))).json()).error, 'cooldown');
  } finally {
    await reader?.cancel().catch(() => {});
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  }
});

test('HTTP timeouts count as failures without inventing a latency sample', async () => {
  const abort = new AbortController();
  const samples = [];
  const request = (_url, { signal }) => new Promise((_, reject) =>
    signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  const work = runHttp(preset('smoke'), 'http://127.0.0.1:3000', abort.signal,
    interval => samples.push(...interval.samples), request);
  const stopped = assert.rejects(work, { name: 'AbortError' });
  try {
    const deadline = performance.now() + 7000;
    while (samples.length === 0 && performance.now() < deadline) await wait(50);
    assert.deepEqual(samples[0], { count: 1, latency: null, status: null, ok: false, checked: false, failure: 'timeout' });
  } finally {
    abort.abort();
    await stopped;
  }
});
