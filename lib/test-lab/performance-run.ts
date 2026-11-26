import { durations, endpoints, profiles, scenarioIds, thresholdKeys, thresholdPass, type PerformanceConfiguration } from './performance';

export const realLimits = { vus: 3, duration: 15, requests: 30, rate: 2, timeout: 5000, cooldown: 30_000 } as const;
export const realScenarios = ['smoke', 'load', 'custom'] as const;
export type Mode = 'simulation' | 'http';
export type Sample = { count: number; latency: number | null; status: number | null; ok: boolean; checked: boolean; failure?: 'timeout' | 'network' };
export type SimulationDiagnostics = {
  arrived: number; completed: number; rejected: number; timedOut: number; cancelled: number;
  queued: number; inService: number; peakQueue: number; peakVus: number;
  busySlotMs: number; nominalRate: number; maximumRate: number; slots: number; version: number;
};
export type Interval = { time: number; vus: number; samples: Sample[]; diagnostics?: SimulationDiagnostics };
export type Log = { time: string; level: 'INFO' | 'WARN' | 'ERROR' | 'PASS' | 'FAIL'; message: string;
  criterion?: typeof thresholdKeys[number]; detail?: string };
export type Run = {
  id: string; startedAt: string; mode: Mode; configuration: PerformanceConfiguration;
  status: 'running' | 'completed' | 'interrupted' | 'failed';
  intervals: Interval[]; elapsed: number; logs: Log[]; error?: string; processing?: number;
};

export function validConfiguration(value: unknown, mode: Mode): value is PerformanceConfiguration {
  if (!value || typeof value !== 'object') return false;
  const c = value as PerformanceConfiguration;
  return scenarioIds.includes(c.scenario) && endpoints.includes(c.endpoint) && profiles.includes(c.profile)
    && Number.isInteger(c.vus) && c.vus >= 1 && c.vus <= 100 && durations.some(d => d === c.duration)
    && !!c.thresholds && thresholdKeys.every(key => Number.isFinite(c.thresholds[key])
      && c.thresholds[key] >= 0 && c.thresholds[key] <= (key === 'errors' ? 100 : Number.MAX_SAFE_INTEGER))
    && (mode !== 'http' || (realScenarios.some(s => s === c.scenario) && c.vus <= realLimits.vus
      && c.duration === realLimits.duration && c.profile === 'constant'));
}

export function summarize(samples: Sample[], duration: number) {
  const requests = samples.reduce((sum, s) => sum + s.count, 0);
  const failed = samples.reduce((sum, s) => sum + (s.ok ? 0 : s.count), 0);
  const checksPassed = samples.reduce((sum, s) => sum + (s.checked ? s.count : 0), 0);
  const latencies = samples.filter(s => s.latency !== null).sort((a, b) => a.latency! - b.latency!);
  const size = latencies.reduce((sum, s) => sum + s.count, 0);
  // Weighted nearest rank. One bucket can stand in for several simulated requests.
  function percentile(p: number): number | null {
    if (!size) return null;
    let rank = Math.max(1, Math.ceil(size * p));
    return latencies.find(s => (rank -= s.count) <= 0)?.latency ?? null;
  }
  const statuses: Record<string, number> = {};
  for (const sample of samples) {
    const key = sample.status === null ? sample.failure ?? 'network' : String(sample.status);
    statuses[key] = (statuses[key] ?? 0) + sample.count;
  }
  return { requests, failed, succeeded: requests - failed, checksPassed, checksFailed: requests - checksPassed, statuses, size,
    throughput: duration > 0 ? requests / duration : null, successfulThroughput: duration > 0 ? (requests - failed) / duration : null,
    errors: requests ? failed / requests * 100 : null,
    average: size ? latencies.reduce((sum, s) => sum + s.latency! * s.count, 0) / size : null,
    min: percentile(0), max: percentile(1), p50: percentile(.5), p90: percentile(.9), p95: percentile(.95), p99: percentile(.99) };
}

export function report(run: Run) {
  const metrics = summarize(run.intervals.flatMap(point => point.samples), run.elapsed);
  const criteria = thresholdKeys.map(key => {
    const observed = metrics[key];
    const expected = run.configuration.thresholds[key];
    const result = run.status === 'running' ? 'pending' : run.status !== 'completed' || observed === null ? 'inconclusive'
      : thresholdPass(key, observed, expected) ? 'pass' : 'fail';
    return { key, observed, expected, result } as const;
  });
  const result = criteria.some(row => row.result === 'fail') ? 'fail' : criteria.every(row => row.result === 'pass') ? 'pass'
    : run.status === 'running' ? 'pending' : 'inconclusive';
  return { ...metrics, criteria, result, peak: Math.max(0, ...run.intervals.map(point => point.diagnostics?.peakVus ?? point.vus)) } as const;
}

export function simulationObservations(intervals: Interval[]) {
  let pressured = false;
  let recovered = false;
  let congestedLatency = 0;
  for (const { diagnostics, samples } of intervals) {
    if (!diagnostics) continue;
    if (diagnostics.peakQueue === 0 && !pressured) continue;
    let count = 0;
    let latencySum = 0;
    for (const sample of samples) {
      if (sample.latency === null) continue;
      count += sample.count;
      latencySum += sample.latency * sample.count;
    }
    const average = count ? latencySum / count : null;
    if (diagnostics.peakQueue > 0) {
      pressured = true;
      recovered = false;
      congestedLatency = Math.max(congestedLatency, average ?? 0);
    } else if (pressured && average !== null && average < congestedLatency) {
      recovered = true;
    }
  }
  return { pressured, recovered };
}

export function comparable(first: Run, second: Run) {
  const a = first.configuration;
  const b = second.configuration;
  return first.mode === second.mode && first.intervals[0]?.diagnostics?.version === second.intervals[0]?.diagnostics?.version
    && a.endpoint === b.endpoint && a.vus === b.vus && a.duration === b.duration
    && a.profile === b.profile && a.scenario === b.scenario && thresholdKeys.every(key => a.thresholds[key] === b.thresholds[key]);
}

export function log(run: Run, level: Log['level'], message: string, criterion?: Log['criterion'], detail?: string) {
  run.logs.push({ time: new Date().toISOString(), level, message, criterion, detail });
  if (run.logs.length > 60) run.logs.shift();
}
