import { activeUsers, pacing, type PerformanceConfiguration } from './performance';
import type { Interval, Sample, SimulationDiagnostics } from './performance-run';

export { activeUsers } from './performance';

type ServerModel = {
  nominalRate: number; maximumRate: number; slots: number; queueLimit: number; timeoutMs: number;
  healthyErrorRate: number; pressureQueue: number; maxPressureMultiplier: number;
  soakSlowdown: number; buckets: number; profileStepMs: number;
};

export const model = {
  nominalRate: 250, maximumRate: 350, slots: 16, queueLimit: 72, timeoutMs: 3000,
  healthyErrorRate: .002, pressureQueue: 30, maxPressureMultiplier: 3,
  soakSlowdown: .2, buckets: 24, profileStepMs: 50,
} as const satisfies ServerModel;

type User = { phase: 'ready' | 'queued' | 'service'; at: number; arrival: number; timedOut: boolean };

function latencyBucket(ms: number) {
  const width = ms <= 200 ? 5 : ms <= 1000 ? 20 : 100;
  return Math.ceil(ms / width) * width;
}

export function* simulate(configuration: PerformanceConfiguration, seed = 1729): Generator<Interval> {
  const horizon = configuration.duration * 1000;
  const thinkMs = pacing(configuration) * 1000;
  const serviceMs = model.slots / model.nominalRate * 1000;
  const fastestMs = model.slots / model.maximumRate * 1000;
  const users: User[] = [];
  const queue: User[] = [];
  const samples = new Map<string, Sample>();
  let active = 0;
  let busy = 0;
  let time = 0;
  let profileAt = 0;
  let random = seed >>> 0;
  let diagnostics = intervalDiagnostics();

  function intervalDiagnostics(): SimulationDiagnostics {
    return { arrived: 0, completed: 0, rejected: 0, timedOut: 0, cancelled: 0,
      queued: queue.length, inService: busy, peakQueue: queue.length, peakVus: active,
      busySlotMs: 0, nominalRate: model.nominalRate, maximumRate: model.maximumRate, slots: model.slots, version: 2 };
  }

  function nextRandom() {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return random / 4294967296;
  }

  function record(user: User, status: number | null, reason?: Sample['failure']) {
    const latency = latencyBucket(time - user.arrival);
    const key = status + ':' + latency;
    const existing = samples.get(key);
    if (existing) existing.count++;
    else samples.set(key, { count: 1, latency, status, ok: status === 200, checked: status === 200, ...(reason && { failure: reason }) });
    user.phase = 'ready';
    user.at = time + thinkMs;
  }

  function dispatch() {
    while (queue.length && busy < model.slots) {
      const user = queue.shift()!;
      // Pressure slows only new work. Already dispatched work keeps its assigned completion time.
      const pressure = Math.min(model.maxPressureMultiplier, 1 + queue.length / model.pressureQueue);
      const soak = configuration.profile === 'sustained' ? 1 + model.soakSlowdown * time / horizon : 1;
      const service = Math.max(fastestMs, serviceMs * pressure * soak * (.85 + nextRandom() * .3));
      const deadline = user.arrival + model.timeoutMs;
      user.phase = 'service';
      user.timedOut = time + service >= deadline;
      user.at = Math.min(deadline, time + service);
      busy++;
    }
  }

  function reconcile(target: number) {
    if (target < active) {
      for (let i = target; i < active; i++) {
        const user = users[i];
        if (user.phase === 'ready') continue;
        if (user.phase === 'service') busy--;
        else queue.splice(queue.indexOf(user), 1);
        diagnostics.cancelled++;
      }
    }
    for (let i = active; i < target; i++) {
      // Active users start at different phases, avoiding a synchronized batch on the first tick.
      users[i] = { phase: 'ready', at: time + nextRandom() * thinkMs, arrival: 0, timedOut: false };
    }
    active = target;
    diagnostics.peakVus = Math.max(diagnostics.peakVus, active);
    dispatch();
  }

  function advance(next: number) {
    diagnostics.busySlotMs += busy * (next - time);
    time = next;
  }

  for (let index = 1; index <= model.buckets; index++) {
    const boundary = horizon * index / model.buckets;
    for (;;) {
      let next = profileAt;
      let user: User | undefined;
      for (let i = 0; i < active; i++) {
        if (users[i].at < next) { user = users[i]; next = user.at; }
      }
      if (next >= boundary) break;
      advance(next);
      if (!user) {
        reconcile(activeUsers(configuration, time / 1000));
        profileAt += model.profileStepMs;
        continue;
      }
      if (user.phase === 'ready') {
        diagnostics.arrived++;
        user.arrival = time;
        if (queue.length >= model.queueLimit) {
          diagnostics.rejected++;
          record(user, 503);
        } else {
          user.phase = 'queued';
          user.at = time + model.timeoutMs;
          queue.push(user);
          dispatch();
          diagnostics.peakQueue = Math.max(diagnostics.peakQueue, queue.length);
        }
      } else if (user.phase === 'queued') {
        queue.splice(queue.indexOf(user), 1);
        diagnostics.timedOut++;
        record(user, null, 'timeout');
      } else {
        busy--;
        if (user.timedOut) {
          diagnostics.timedOut++;
          record(user, null, 'timeout');
        } else {
          diagnostics.completed++;
          record(user, nextRandom() < model.healthyErrorRate ? 500 : 200);
        }
        dispatch();
      }
    }
    advance(boundary);
    const vus = active;
    if (index === model.buckets) reconcile(0);
    diagnostics.queued = queue.length;
    diagnostics.inService = busy;
    yield { time: boundary / 1000, vus, samples: [...samples.values()], diagnostics };
    samples.clear();
    diagnostics = intervalDiagnostics();
  }
}
