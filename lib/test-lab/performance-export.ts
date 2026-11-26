import { report, type Run } from './performance-run';

// UTC and second precision keep the basename stable across locales and formats.
export function buildPerformanceExportFilename(run: Pick<Run, 'configuration' | 'startedAt'>, format: 'json' | 'csv') {
  const { scenario, vus, duration } = run.configuration;
  const utc = new Date(run.startedAt).toISOString();
  const date = utc.slice(0, 10);
  const time = utc.slice(11, 19).replaceAll(':', '');
  return `performance-${scenario}-test-${vus}vus-${duration}s-${date}-${time}.${format}`;
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function csvCell(value: string | number | null) {
  const safe = typeof value === 'string' && /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : String(value ?? '');
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function exportCsv(run: Run) {
  const m = report(run);
  const c = run.configuration;
  return [
    ['id', 'scenario', 'mode', 'endpoint', 'duration', 'vus', 'requests', 'throughput', 'average', 'p50', 'p90', 'p95', 'p99', 'errors', 'result', 'successfulThroughput'],
    [run.id, c.scenario, run.mode, c.endpoint, run.elapsed, c.vus, m.requests, m.throughput, m.average, m.p50, m.p90, m.p95, m.p99, m.errors, m.result, m.successfulThroughput],
  ].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function exportJson(run: Run, analysis: string[]) {
  return JSON.stringify({ ...run, report: report(run), analysis }, null, 2);
}
