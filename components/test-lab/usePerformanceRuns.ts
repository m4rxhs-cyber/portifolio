'use client';

import { useEffect, useRef, useState } from 'react';
import type { PerformanceConfiguration } from '@/lib/test-lab/performance';
import { log, report, validConfiguration, type Interval, type Mode, type Run } from '@/lib/test-lab/performance-run';

const historyKey = 'engineering-dark-performance-v1';
function readHistory(): { records: Run[]; failed: boolean } {
  if (typeof window === 'undefined') return { records: [], failed: false };
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(historyKey) ?? '[]');
    if (!Array.isArray(raw)) return { records: [], failed: true };
    const records = raw.slice(0, 20).filter(item => item && typeof item.id === 'string'
      && (item.mode === 'http' || item.mode === 'simulation') && validConfiguration(item.configuration, item.mode)
      && ['completed', 'interrupted', 'failed'].includes(item.status)
      && Array.isArray(item.intervals) && item.intervals.length <= 30 && Array.isArray(item.logs));
    return { records, failed: false };
  } catch { return { records: [], failed: true }; }
}

async function receive(configuration: PerformanceConfiguration, signal: AbortSignal, publish: (interval: Interval) => void) {
  const response = await fetch('/api/test-lab/performance', { method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(configuration) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'network');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('network');
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let end = buffer.indexOf('\n');
      while (end >= 0) {
        const event = JSON.parse(buffer.slice(0, end));
        if (event.error) throw new Error(event.error);
        if (event.interval) publish(event.interval);
        if (event.done) done = true;
        buffer = buffer.slice(end + 1);
        end = buffer.indexOf('\n');
      }
    }
    if (!done) throw new Error('network');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function usePerformanceRuns() {
  const [saved, setSaved] = useState(readHistory);
  const records = useRef(saved.records);
  const [run, setRun] = useState<Run>();
  const [validation, setValidation] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const abandon = () => active.current?.abort();
    window.addEventListener('pagehide', abandon);
    return () => { mounted.current = false; window.removeEventListener('pagehide', abandon); abandon(); };
  }, []);

  function save(next: Run[]) {
    records.current = next.slice(0, 20);
    let failed = false;
    try { sessionStorage.setItem(historyKey, JSON.stringify(records.current)); } catch { failed = true; }
    setSaved({ records: records.current, failed });
  }

  async function execute(configuration: PerformanceConfiguration, mode: Mode) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setValidation(true);
    setError('');
    setRun(undefined);
    const start = performance.now();
    const current: Run = {
      id: Array.from(crypto.getRandomValues(new Uint8Array(16)), value => value.toString(16).padStart(2, '0')).join(''),
      startedAt: new Date().toISOString(), mode, configuration: structuredClone(configuration),
      status: 'running', intervals: [], elapsed: 0, logs: [],
    };
    function publish() {
      if (mounted.current) setRun({ ...current, intervals: [...current.intervals], logs: [...current.logs] });
    }
    function add(interval: Interval) {
      if (controller.signal.aborted) return;
      const previous = current.intervals.at(-1);
      current.intervals.push(interval);
      current.elapsed = interval.time;
      const data = interval.diagnostics;
      if (data) {
        const seconds = interval.time - (previous?.time ?? 0);
        const utilization = data.busySlotMs / (seconds * 1000 * data.slots) * 100;
        const detail = [
          `t=${interval.time.toFixed(2)}s`, `capacity=${data.nominalRate}/${data.maximumRate} req/s`,
          `demand=${(data.arrived / seconds).toFixed(1)} req/s`, `utilization=${utilization.toFixed(1)}%`,
          `queue=${data.queued}/${data.peakQueue}`, `processed=${data.completed}`,
          `503=${data.rejected}`, `500=${interval.samples.filter(sample => sample.status === 500).reduce((count, sample) => count + sample.count, 0)}`,
          `timeouts=${data.timedOut}`, `cancelled=${data.cancelled}`,
        ].join(' · ');
        const priorPeak = previous?.diagnostics?.peakQueue ?? 0;
        const event = data.peakQueue > 0 && priorPeak === 0 ? 'saturation'
          : data.peakQueue === 0 && priorPeak > 0 ? 'recovery' : 'samples';
        log(current, data.rejected || data.timedOut ? 'WARN' : 'INFO', event, undefined, detail);
      } else if (current.intervals.length === 1) log(current, 'INFO', 'samples');
      if (interval.samples.some(sample => sample.failure === 'timeout') && !current.logs.some(entry => entry.message === 'timeout')) {
        log(current, 'WARN', 'timeout');
      }
      if (interval.samples.some(sample => sample.failure === 'network') && !current.logs.some(entry => entry.message === 'networkFailure')) {
        log(current, 'WARN', 'networkFailure');
      }
      publish();
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      controller.signal.throwIfAborted();
      if (!validConfiguration(current.configuration, mode)) throw new Error('invalid');
      log(current, 'INFO', 'validated');
      setValidation(false);
      publish();
      if (mode === 'http') {
        await receive(current.configuration, controller.signal, add);
        if (!current.intervals.some(interval => interval.samples.some(sample => sample.status !== null))) throw new Error('network');
      } else {
        const { simulate } = await import('@/lib/test-lab/performance-simulation');
        for (const interval of simulate(current.configuration)) {
          await new Promise(resolve => setTimeout(resolve, 75));
          controller.signal.throwIfAborted();
          add(interval);
        }
      }
      controller.signal.throwIfAborted();
      current.status = 'completed';
      for (const row of report(current).criteria) log(current, row.result === 'pass' ? 'PASS' : row.result === 'fail' ? 'FAIL' : 'WARN', row.result, row.key);
      log(current, 'INFO', 'completed');
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'internal';
      current.error = ['invalid', 'busy', 'cooldown', 'unavailable', 'network'].includes(message) ? message : 'internal';
      current.status = controller.signal.aborted ? 'interrupted' : 'failed';
      log(current, controller.signal.aborted ? 'WARN' : 'ERROR', controller.signal.aborted ? 'interrupted' : current.error);
      if (mounted.current && !controller.signal.aborted) setError(current.error);
    } finally {
      current.processing = (performance.now() - start) / 1000;
      active.current = null;
      if (mounted.current) {
        setValidation(false);
        publish();
        save([current, ...records.current]);
      }
    }
  }

  return { run, records: saved.records, storageFailed: saved.failed, error, validation, execute,
    interrupt: () => active.current?.abort(), show: setRun,
    remove: (id?: string) => save(id ? records.current.filter(entry => entry.id !== id) : []) };
}
