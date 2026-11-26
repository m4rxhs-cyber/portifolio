import type { PerformanceConfiguration } from './performance';
import { realLimits, validConfiguration, type Interval, type Sample } from './performance-run';

export const probeRoutes = {
  '/api/test-lab/rest/customers': '/api/test-lab/performance?fixture=customers',
  '/api/test-lab/rest/orders': '/api/test-lab/performance?fixture=orders',
} as const;
const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(signal.reason); return; }
  function cancel() { clearTimeout(timer); reject(signal.reason); }
  const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
  signal.addEventListener('abort', cancel, { once: true });
});

export function createGate(now = Date.now) {
  let busy = false;
  let last = -Infinity;
  return () => {
    if (busy) return 'busy' as const;
    if (now() - last < realLimits.cooldown) return 'cooldown' as const;
    busy = true;
    last = now();
    return () => { busy = false; };
  };
}

export async function runHttp(c: PerformanceConfiguration, origin: string, signal: AbortSignal,
  publish: (interval: Interval) => void, request = fetch) {
  const target = probeRoutes[c.endpoint];
  if (!validConfiguration(c, 'http') || !target || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('invalid');
  const start = performance.now();
  const deadline = start + c.duration * 1000;
  const period = 1000 / realLimits.rate;
  const pending = new Set<Promise<void>>();
  let samples: Sample[] = [];
  let peak = 0;
  let lastPublish = start;
  function emit() {
    const now = performance.now();
    publish({ time: Math.min(c.duration, (now - start) / 1000), vus: peak, samples });
    samples = [];
    peak = pending.size;
    lastPublish = now;
  }
  async function measure() {
    const began = performance.now();
    const timeout = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(realLimits.timeout, deadline - began))));
    try {
      const response = await request(origin + target, { method: 'GET', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.any([signal, timeout]) });
      const bodyText = await response.text();
      let body: unknown;
      try { body = JSON.parse(bodyText); } catch { body = null; }
      if (!signal.aborted) samples.push({ count: 1, latency: performance.now() - began, status: response.status,
        ok: response.ok, checked: response.status === 200 && Array.isArray(body) && body.length > 0 });
    } catch {
      if (!signal.aborted) samples.push({ count: 1, latency: null, status: null, ok: false, checked: false,
        failure: timeout.aborted ? 'timeout' : 'network' });
    }
  }
  try {
    for (let sent = 0; sent < realLimits.requests && performance.now() < deadline;) {
      signal.throwIfAborted();
      if (pending.size < c.vus) {
        const task = measure().finally(() => { pending.delete(task); });
        pending.add(task); sent++;
        peak = Math.max(peak, pending.size);
      }
      await pause(Math.min(period, Math.max(0, deadline - performance.now())), signal);
      if (performance.now() - lastPublish >= 995 && performance.now() < deadline) emit();
    }
  } finally {
    await Promise.allSettled(pending);
    if (!signal.aborted) emit();
  }
}
