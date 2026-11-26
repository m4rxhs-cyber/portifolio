const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const { runBooker } = require('../lib/test-lab/booker.ts');
const { runAuthentication, reproduceBug } = require('../lib/test-lab/local.ts');
const { handleAuth } = require('../lib/test-lab/auth-api.ts');
const { runAuthScenario } = require('../lib/test-lab/auth-runner.ts');
const { handleRest } = require('../lib/test-lab/rest-api.ts');
const { createRestClient, assertReply, customerExample, requestPath } = require('../lib/test-lab/rest-client.ts');
const { runRestScenario, scenarioRequests } = require('../lib/test-lab/rest-scenarios.ts');
const { mkdtemp, readdir, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
require('./performance-tests.cjs');

test('shares importable scenario steps and builds safe path and query previews', async () => {
  assert.deepEqual(scenarioRequests.map(steps => steps.length), [1, 1, 3, 1, 1, 1, 1, 6]);
  const patch = scenarioRequests[7][2];
  assert(patch.needsCreatedId);
  assert.deepEqual(patch.operation.body, { name: 'Updated QA' });
  assert.equal(requestPath(patch.operation.endpoint, '3'), 'customers/3');
  assert.equal(requestPath(patch.operation.endpoint, '../orders'), 'customers/:id');
  assert.equal(requestPath('customers', '1', 'page=1&limit=10'), 'customers?page=1&limit=10');
  const client = createRestClient(async (url, init) => {
    assert.equal(url, '/api/test-lab/rest/customers/3');
    assert.deepEqual(JSON.parse(init.body), { name: 'Updated QA' });
    return Response.json({ data: { id: 3, name: 'Updated QA' } });
  });
  const response = await client.request('unit-test', { ...patch.operation, id: '3' });
  assert(patch.assertions.every(assertion => assertReply(response, assertion).pass));
  await assert.rejects(client.request('unit-test', { ...patch.operation, id: '' }), { kind: 'configuration' });
  await assert.rejects(client.request('unit-test', { ...patch.operation, id: '../orders' }), { kind: 'configuration' });
});

test('executes eight REST scenarios, isolates resources and enforces request restrictions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'test-lab-rest-'));
  const previous = process.env.LAB_REST_WORKSPACE_DIR;
  process.env.LAB_REST_WORKSPACE_DIR = directory;
  const transport = (path, init) => {
    const request = new Request('http://localhost' + path, init);
    return handleRest(request, new URL(request.url).pathname.split('/').slice(4));
  };
  const client = createRestClient(transport);
  try {
    for (let index = 0; index < 8; index++) {
      const run = await runRestScenario(index, client);
      assert.equal(run.error, undefined, JSON.stringify(run));
      assert(run.steps.length && run.steps.flatMap(step => step.checks).every(check => check.pass), JSON.stringify(run));
    }
    assert.deepEqual(await readdir(directory), []);
    const a = await client.open();
    const b = await client.open();
    const added = await client.request(a, { endpoint: 'customers', method: 'POST', body: customerExample });
    assert.equal(added.status, 201);
    const id = String(added.body.data.id);
    assert.equal((await client.request(b, { endpoint: 'customer-by-id', method: 'GET', id })).status, 404);
    const update = await client.request(a, { endpoint: 'customer-by-id', method: 'PUT', id, body: { ...customerExample, status: 'inactive' } });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.status, 'inactive');
    assert(assertReply(update, { kind: 'type', field: 'data.id', expected: 'number' }).pass);
    assert(!assertReply(update, { kind: 'equals', field: 'data.name', expected: 'Other' }).pass);
    assert(!assertReply(update, { kind: 'exists', field: 'data.constructor', expected: '' }).pass);
    const raw = (suffix, method, body) => transport('/api/test-lab/rest/' + suffix, { method, body, headers: { 'X-Demo-Workspace': a, 'Content-Type': 'application/json' } });
    assert.equal((await raw('customers', 'POST', '{')).status, 400);
    assert.equal((await raw('customers', 'POST', 'a'.repeat(4097))).status, 413);
    assert.equal((await raw('orders/2', 'DELETE')).status, 405);
    assert.equal((await raw('unknown', 'GET')).status, 404);
    assert.equal((await raw('customers?limit=50', 'GET')).status, 400);
    await assert.rejects(client.request(a, { endpoint: 'customers', method: 'GET', headers: { Host: 'other.example.test' } }), { kind: 'configuration' });
    await client.close(a); await client.close(b);
    assert.deepEqual(await readdir(directory), []);
    let limited;
    for (let index = 0; index < 240 && !limited; index++) limited = (await raw('customers', 'GET')).status === 429;
    assert(limited);
  } finally {
    if (previous === undefined) delete process.env.LAB_REST_WORKSPACE_DIR;
    else process.env.LAB_REST_WORKSPACE_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('classifies REST request timeout and bounds oversized responses', async () => {
  const timeout = createRestClient(async (_path, { signal }) => { await delay(100, undefined, { signal }); }, 5);
  await assert.rejects(timeout.open(), { kind: 'timeout' });
  const oversized = createRestClient(async () => new Response('a'.repeat(32769)));
  await assert.rejects(oversized.open(), { kind: 'response' });
});

test('validates all five authentication scenarios against the API handlers and isolates sessions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'test-lab-auth-'));
  const previousDirectory = process.env.LAB_AUTH_SESSION_DIR;
  process.env.LAB_AUTH_SESSION_DIR = directory;
  const transport = (path, init) => handleAuth(new Request('http://localhost' + path, init), path.split('/').at(-1));
  const login = (email, password) => transport('/api/test-lab/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const session = token => transport('/api/test-lab/auth/session', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  const logout = token => transport('/api/test-lab/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
  try {
    for (let scenario = 0; scenario < 5; scenario++) {
      const run = await runAuthScenario(scenario, transport);
      assert.equal(run.error, undefined);
      assert(run.checks.length > 5 && run.checks.every(check => check.pass));
      assert(!JSON.stringify(run).includes('demo-password'));
    }
    assert.deepEqual(await readdir(directory), []);
    const blocked = await login('locked@example.test', 'demo-password');
    assert.equal(blocked.status, 403);
    assert.deepEqual(await blocked.json(), { code: 'ACCOUNT_LOCKED', authenticated: false });
    const invalid = await login('missing@example.test', 'demo-password');
    assert.equal(invalid.status, 401);
    assert.equal((await invalid.json()).code, 'INVALID_CREDENTIALS');
    const malformed = await transport('/api/test-lab/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.equal((await session()).status, 401);
    const a = (await (await login('demo@example.test', 'demo-password')).json()).token;
    const b = (await (await login('demo@example.test', 'demo-password')).json()).token;
    assert.notEqual(a, b);
    assert.equal((await session(a)).status, 200);
    assert.equal((await logout(a)).status, 200);
    assert.equal((await session(a)).status, 401);
    assert.equal((await session(b)).status, 200);
    const [remaining] = await readdir(directory);
    await writeFile(join(directory, remaining), '1');
    const expired = await session(b);
    assert.equal(expired.status, 401);
    assert.equal((await expired.json()).code, 'SESSION_INVALID');
    assert.deepEqual(await readdir(directory), []);
  } finally {
    if (previousDirectory === undefined) delete process.env.LAB_AUTH_SESSION_DIR;
    else process.env.LAB_AUTH_SESSION_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});

test('separates failed assertions from network, timeout and malformed response errors', async () => {
  const failed = await runAuthScenario(2, async () => Response.json({ code: 'SESSION_REQUIRED', authenticated: false }, { status: 401 }));
  assert.equal(failed.error, undefined);
  assert(failed.checks.some(check => !check.pass && check.field === 'code'));
  const network = await runAuthScenario(0, async () => { throw new TypeError('offline'); });
  assert.equal(network.error, 'network');
  const timeout = await runAuthScenario(0, async (_path, { signal }) => { await delay(100, undefined, { signal }); }, 5);
  assert.equal(timeout.error, 'timeout');
  const malformed = await runAuthScenario(0, async () => new Response('bad JSON'));
  assert.equal(malformed.error, 'response');
});

process.env.BOOKER_USERNAME = 'unit-test';
process.env.BOOKER_PASSWORD = 'unit-test-password';

function mockBooker({ reuseId = false } = {}) {
  let record;
  const methods = [];
  const fetch = async (url, request) => {
    const path = new URL(url).pathname;
    const method = request.method;
    methods.push(method + ' ' + path);
    const input = request.body ? JSON.parse(request.body) : undefined;
    if (path === '/auth') return Response.json({ token: 'secret-test-token' });
    if (path === '/booking' && method === 'POST') {
      record = input;
      return Response.json({ bookingid: 42, booking: record });
    }
    if (method === 'GET') {
      return record ? Response.json(reuseId ? { ...record, lastname: 'Unrelated' } : record) : new Response('Not Found', { status: 404 });
    }
    assert.equal(request.headers.Cookie, 'token=secret-test-token');
    if (method === 'DELETE') {
      record = undefined;
      return new Response('Created', { status: 201 });
    }
    record = { ...record, ...input };
    return Response.json(record);
  };
  return { fetch, methods };
}

test('runs the isolated authentication scenarios and detects each synthetic defect', () => {
  for (let i = 0; i < 5; i++) assert.equal(runAuthentication(i).status, 'PASSED');
  for (let i = 0; i < 3; i++) {
    assert.equal(reproduceBug(i, true).status, 'FAILED');
    assert.equal(reproduceBug(i, false).status, 'PASSED');
  }
});

test('updates, verifies, deletes and redacts sensitive exchange data', async () => {
  const mock = mockBooker();
  const run = await runBooker('e2e', mock.fetch);
  assert.equal(run.status, 'PASSED');
  assert.deepEqual(mock.methods, [
    'POST /auth', 'POST /booking', 'GET /booking/42', 'PUT /booking/42',
    'GET /booking/42', 'GET /booking/42', 'DELETE /booking/42', 'GET /booking/42',
  ]);
  assert.doesNotMatch(JSON.stringify(run), /unit-test-password|secret-test-token/);
});

test('refuses writes when the returned ID points to an unrelated booking', async () => {
  const mock = mockBooker({ reuseId: true });
  const run = await runBooker('put', mock.fetch);
  assert.equal(run.status, 'ERROR');
  assert.equal(run.error, 'ownership');
  assert.ok(!mock.methods.some((method) => /^(PUT|DELETE)/.test(method)));
  assert.doesNotMatch(JSON.stringify(run), /Unrelated/);
});

test('checks the actual list contract and classifies technical errors', async () => {
  assert.equal((await runBooker('list', async () => Response.json([]))).status, 'PASSED');
  assert.equal((await runBooker('list', async () => Response.json([{ bookingid: '42' }]))).status, 'FAILED');
  assert.equal((await runBooker('ping', async () => new Response(null, { status: 503 }))).error, 'upstream');
  const result = await runBooker('ping', (_, { signal }) => new Promise((_, reject) => {
    const keepAlive = setInterval(() => {}, 500);
    signal.addEventListener('abort', () => { clearInterval(keepAlive); reject(signal.reason); }, { once: true });
  }));
  assert.equal(result.error, 'timeout');
  assert.equal(result.status, 'ERROR');
});

const { investigation } = require('../lib/test-lab/investigation.ts');
const { checkoutResult, expectedCheckout, validCoupon, initialCheckout, initialRegistration, registrationResult,
  demoCustomer, compareCustomer, emptyDraft, exampleDraft } = require('../lib/test-lab/investigation-model.ts');
const { evaluateBugReport } = require('../lib/test-lab/investigation-score.ts');

test('bug investigation reproduces the checkout discrepancy only with the valid coupon', () => {
  assert.equal(validCoupon(' teste10 '), true);
  assert.equal(validCoupon('TESTE20'), false);
  assert.deepEqual(expectedCheckout(1, true), { subtotal: 500, discount: 50, expected: 450 });
  assert.equal(checkoutResult(1, true).observed, 475);
  assert.equal(checkoutResult(2, true).observed, 950);
  assert.equal(checkoutResult(2, false).difference, 0);
  assert.deepEqual(initialCheckout, { quantity: 1, coupon: '', applied: false });
  assert.equal(checkoutResult(initialCheckout.quantity, initialCheckout.applied).observed, 500);
});

test('bug investigation accepts a malformed email while retaining other registration rules', () => {
  const data = { name: 'Demo', email: 'demo@example.test', password: 'scenario8', confirmation: 'scenario8' };
  assert.equal(registrationResult(data).accepted, true);
  assert.equal(registrationResult(data).reproduced, false);
  const malformed = { ...data, email: 'usuario-sem-arroba' };
  assert.equal(registrationResult(malformed).reproduced, true);
  for (const invalid of [{ name: '' }, { email: '' }, { password: 'short', confirmation: 'short' }, { confirmation: 'different' }]) {
    assert.equal(registrationResult({ ...malformed, ...invalid }).accepted, false);
  }
  assert.equal(registrationResult(initialRegistration).accepted, false);
});

test('bug investigation identifies only the customer status mismatch in an isolated comparison', () => {
  const first = compareCustomer(demoCustomer, 200);
  assert.equal(first.method, 'GET');
  assert.equal(first.status, 200);
  assert.equal(first.api.status, 'active');
  assert.equal(first.ui.status, 'inactive');
  assert.equal(first.field, 'status');
  assert.deepEqual({ ...first.ui, status: first.api.status }, first.api);
  assert.deepEqual(compareCustomer(demoCustomer, 200), first);
  assert.equal(demoCustomer.status, 'active');
});

test('bug report scoring checks scenario facts and accepts only matching captured evidence', () => {
  const at = '2026-01-01T00:00:00.000Z';
  const captured = [
    { id: 'a', at, scenario: 'BUG-001', data: checkoutResult(1, true) },
    { id: 'b', at, scenario: 'BUG-002', data: { accepted: true, example: 'usuario-sem-arroba' } },
    { id: 'c', at, scenario: 'BUG-003', data: compareCustomer(demoCustomer, 200) },
  ];
  for (const { cases, web } of Object.values(investigation)) {
    cases.forEach((scenario, index) => {
      const example = exampleDraft(scenario, web);
      const evidence = captured[index];
      const wrong = captured[(index + 1) % captured.length];
      assert.equal(evaluateBugReport(scenario, emptyDraft).score, 0);
      assert.equal(evaluateBugReport(scenario, example).score, 95);
      assert.equal(evaluateBugReport(scenario, example, evidence).score, 100);
      assert.equal(evaluateBugReport(scenario, example, wrong).criteria[6].met, false);
      const edited = evaluateBugReport(scenario, { ...example, title: 'Erro no sistema', steps: example.steps.split('\n').reverse().join('\n'), expected: example.observed }, evidence);
      for (const criterion of [0, 2, 3, 4]) assert.equal(edited.criteria[criterion].met, false);
      assert(edited.score >= 0 && edited.score < 100);
      const incomplete = evaluateBugReport(scenario, { ...example, steps: '1. Check the result', observed: '' });
      assert.equal(incomplete.criteria[2].met, false);
      assert.equal(incomplete.criteria[4].met, false);
      assert(evaluateBugReport(scenario, example, evidence).score > incomplete.score);
    });
  }
});
