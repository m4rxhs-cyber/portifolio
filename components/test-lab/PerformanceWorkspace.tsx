import { useRef, useState } from 'react';
import {
  Activity, BarChart3, Check, CircleCheck, CircleX, Clipboard, Clock, Download, Gauge, History, Info, List,
  Play, RotateCcw, Settings2, Timer, TrendingUp, TriangleAlert, Users, Zap,
} from 'lucide-react';
import type { Locale } from '@/lib/content';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { runCopy } from '@/lib/test-lab/performance-run-copy';
import { comparable, realLimits, realScenarios, report, simulationObservations, summarize, type Mode, type Run } from '@/lib/test-lab/performance-run';
import { buildPerformanceExportFilename, download, exportCsv, exportJson } from '@/lib/test-lab/performance-export';
import { performanceCopy, type PerformanceCopy } from '@/lib/test-lab/performance-copy';
import {
  buildScript, durations, endpoints, preset, profiles, scenarioIds, thresholdKeys,
  type PerformanceConfiguration, type PerformanceExecutionStatus, type PerformanceScenario,
} from '@/lib/test-lab/performance';
import { LabSelect } from './LabSelect';
import { PerformanceChart } from './PerformanceChart';
import { PerformanceLogs } from './PerformanceLogs';
import { RestTabs } from './RestTabs';
import { usePerformanceRuns } from './usePerformanceRuns';
import styles from './PerformanceWorkspace.module.css';

const scenarioIcons = [Activity, BarChart3, TrendingUp, Zap, Clock, Settings2];
const metricIcons = [List, TrendingUp, TriangleAlert, Timer, Users, Clock];
const codeToken = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\/\/.*$|\b(?:import|from|export|const|default|function|if|throw|new)\b|\b\d+(?:\.\d+)?\b)/;

function Status({ passed, label }: { passed: boolean; label?: string }) {
  const Icon = passed ? CircleCheck : CircleX;
  return <span className={styles.status} data-passed={passed}><Icon size={14} aria-hidden="true" />{label ?? (passed ? 'PASS' : 'FAIL')}</span>;
}

function Columns({ labels }: { labels: readonly string[] }) {
  return <thead><tr>{labels.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>;
}

function NumberField({ label, value, min, max, integer = false, onChange }: {
  label: string; value: number; min: number; max?: number; integer?: boolean; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string>();
  const normalize = (input: number) => integer ? Math.trunc(input) : input;

  return <input type="number" aria-label={label} min={min} max={max} step={integer ? 1 : 'any'} value={draft ?? value}
    onChange={event => {
      const { value: text, valueAsNumber: number } = event.currentTarget;
      if (event.currentTarget === document.activeElement) setDraft(text);
      if (Number.isFinite(number) && number >= min && number <= (max ?? Infinity)) onChange(normalize(number));
    }}
    onBlur={event => {
      const number = event.currentTarget.valueAsNumber;
      if (Number.isFinite(number)) onChange(normalize(Math.min(max ?? Infinity, Math.max(min, number))));
      setDraft(undefined);
    }} />;
}

function ExecutionStatus({ copy, status }: { copy: PerformanceCopy; status: PerformanceExecutionStatus }) {
  return <span className={styles.executionStatus} data-status={status}>{copy.executionStatuses[status]}</span>;
}

function ScriptViewer({ script, copy, filename, downloadLabel, onDownload }: {
  script: string; copy: PerformanceCopy; filename: string; downloadLabel: string; onDownload: () => void;
}) {
  const [notice, setNotice] = useState('');
  return <div className={styles.codeFrame}>
    <div className={styles.codeHeader}>
      <strong>{filename}</strong>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(script); setNotice(copy.copied); }
        catch { setNotice(copy.copyError); }
      }}><Clipboard size={14} aria-hidden="true" />{copy.copy}</button>
      <button type="button" onClick={onDownload}>{downloadLabel}</button>
    </div>
    <p>{copy.scriptNote}</p>
    <p><code>{'k6 run -e BASE_URL=http://localhost:3000 -e DEMO_WORKSPACE=… ' + filename}</code></p>
    <pre tabIndex={0}><code>{script.trimEnd().split('\n').map((line, index) =>
      <span className={styles.line} key={index}><span aria-hidden="true">{index + 1}</span><span>
        {line.split(codeToken).map((part, token) => token % 2 === 0 ? part
          : <span key={token} data-token={part.startsWith('//') ? 'comment' : /^['"]/.test(part) ? 'string' : 'literal'}>{part}</span>)}
      </span></span>)}</code></pre>
    <span className={styles.copyNotice} role="status">{notice}</span>
  </div>;
}

export default function PerformanceWorkspace({ locale }: { locale: Locale }) {
  const copy = performanceCopy[locale];
  const labels = runCopy[locale];
  const [mode, setMode] = useState<Mode>('simulation');
  const httpUnavailable = mode === 'http' && process.env.NODE_ENV !== 'development';
  const execution = usePerformanceRuns();
  const { run, records } = execution;
  const busy = execution.validation || run?.status === 'running';
  const [selection, setSelection] = useState<string[]>([]);
  const [deletion, setDeletion] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [configuration, setConfiguration] = useState(() => preset('load'));
  const [tab, setTab] = useState(0);
  const history = useRef<HTMLDialogElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const format = new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 2 }).format;
  const durationLabel = (seconds: number) => seconds === 300 ? '5 ' + copy.minutes : seconds + ' ' + copy.seconds;
  const scenarioName = (scenario: PerformanceScenario) => copy.names[scenarioIds.indexOf(scenario)];
  const { scenario, vus, duration, endpoint, profile, thresholds } = configuration;
  const metrics = run ? report(run) : undefined;
  const observations = simulationObservations(run?.intervals ?? []);
  const points = (run?.intervals ?? []).map((interval, index, intervals) => ({
    time: interval.time, vus: interval.vus,
    ...summarize(interval.samples, interval.time - (intervals[index - 1]?.time ?? 0)),
  }));
  const times = points.map(point => point.time);
  const units = ['ms', 'ms', '%', 'req/s'];
  const withUnit = (value: number | null | undefined, unit: string) => value == null ? 'N/A' : format(value) + (unit && unit !== '%' ? ' ' : '') + unit;
  const criteria = thresholdKeys.map((key, index) => ({
    label: copy.criteriaNames[index],
    operator: key === 'throughput' ? '> ' : '< ',
    expected: withUnit(run?.configuration.thresholds[key] ?? thresholds[key], units[index]),
    observed: withUnit(metrics?.[key], units[index]),
    result: metrics?.criteria[index].result ?? 'pending',
  }));
  const resultLabel = (result: string) => result === 'pass' ? copy.approve : result === 'fail' ? copy.reject
    : result === 'pending' ? labels.pending : labels.inconclusive;
  const analysis = !run ? [] : run.status === 'interrupted' ? [labels.partial] : run.status !== 'completed' ? []
    : [
      ...(metrics?.result === 'pass' ? [labels.allPassed] : []),
      ...(metrics?.criteria.filter(row => row.result === 'fail').map(row =>
        copy.criteriaNames[thresholdKeys.indexOf(row.key)] + ' · ' + labels.messages.fail) ?? []),
      ...(metrics?.result === 'inconclusive' ? [labels.inconclusive] : []),
      ...(run.mode === 'http' && metrics?.criteria.some(row => row.result === 'fail' && (row.key === 'p95' || row.key === 'p99')) ? [labels.hypotheses[0]] : []),
      ...(run.mode === 'http' && metrics?.criteria.some(row => row.result === 'fail' && row.key === 'throughput') ? [labels.hypotheses[1]] : []),
      ...(observations.pressured ? [labels.saturation] : []),
      ...(observations.recovered ? [labels.recovery] : []),
    ];
  const update = (change: Partial<PerformanceConfiguration>) => setConfiguration(current => ({ ...current, ...change }));
  const responseChart = <PerformanceChart key={run?.id ?? scenario} title={copy.response} description={copy.responseHint}
    times={times} unit="ms" format={format} series={[
      { label: 'p95', values: points.map(point => point.p95) },
      { label: copy.average, values: points.map(point => point.average), tone: 'neutral' },
    ]} empty={labels.emptyChart} />;
  const values = [withUnit(metrics?.requests, ''), withUnit(metrics?.throughput, 'req/s'), withUnit(metrics?.errors, '%'),
    withUnit(metrics?.average, 'ms'), withUnit(busy ? points.at(-1)?.vus : run ? 0 : null, ''), withUnit(run?.elapsed, 's')];
  const selected = selection.flatMap(id => records.filter(entry => entry.id === id));
  const baseline = selected[0];
  const baselineMetrics = baseline && report(baseline);
  const percent = new Intl.NumberFormat(locale, { style: 'percent', signDisplay: 'always', maximumFractionDigits: 1 });
  function difference(entry: Run, value: number | null, base: number | null | undefined) {
    return baseline && entry !== baseline && comparable(baseline, entry)
      && entry.status === 'completed' && baseline.status === 'completed' && value !== null && base != null && base > 0
      ? ' (' + percent.format((value - base) / base) + ')' : '';
  }
  const modeLabel = (value: Mode) => labels.modes[value === 'http' ? 1 : 0];
  const cap = mode === 'http' ? realLimits.vus : 100;
  const initial = (id: PerformanceScenario, target = mode): PerformanceConfiguration => {
    const next = preset(id);
    return target === 'http' ? { ...next, vus: Math.min(next.vus, realLimits.vus), duration: realLimits.duration, profile: 'constant' } : next;
  };
  const exportFile = (name: string, value: string, type: string) => {
    try { download(name, value, type); setFeedback(''); } catch { setFeedback(labels.exportError); }
  };
  const message = (key: string) => labels.messages[key as keyof typeof labels.messages] ?? labels.messages.internal;
  const script = tab === 2 ? buildScript(configuration, copy.scriptComment) : '';
  const filename = 'performance-' + scenario + '-test.js';
  const tabId = 'performance-execution';

  return <div className={styles.workspace} data-performance-workspace="">
    <aside className={styles.panel + ' ' + styles.scenarios} aria-labelledby="performance-scenarios">
      <h3 id="performance-scenarios"><Gauge />{copy.scenarios}</h3>
      <p>{copy.choose}</p>
      <div className={styles.scenarioList}>
        {scenarioIds.map((id, index) => {
          const Icon = scenarioIcons[index];
          return <button type="button" key={id} aria-pressed={scenario === id}
            disabled={busy || (mode === 'http' && !realScenarios.some(value => value === id))}
            onClick={() => setConfiguration(initial(id))}>
            <Icon aria-hidden="true" /><span><strong>{copy.names[index]}</strong><small>{copy.descriptions[index]}</small></span>
            <span className={styles.level} data-level={index}>{copy.levels[index]}</span>
          </button>;
        })}
      </div>
      <div className={styles.about}><h4><Info />{copy.about}</h4><p>{copy.aboutText}</p></div>
    </aside>
    <section className={styles.panel + ' ' + styles.builder} aria-labelledby="performance-builder">
      <h3 id="performance-builder"><Gauge />Performance Test Builder</h3>
      <p>{copy.builder}</p>
      <fieldset className={styles.fields} disabled={busy} aria-label={copy.config}>
        <LabSelect name={labels.mode} items={labels.modes.map(title => ({ title }))} value={mode === 'http' ? 1 : 0}
          disabled={busy} onChange={index => {
            const target = index ? 'http' : 'simulation';
            setMode(target);
            setConfiguration(initial(target === 'http' && !realScenarios.some(id => id === scenario) ? 'load' : scenario, target));
          }} />
        <p className={styles.muted}>{mode === 'simulation' ? labels.accelerated : httpUnavailable ? labels.messages.unavailable : labels.localOnly}</p>
        {mode === 'http' && <p className={styles.muted}>{labels.realLimits} {labels.probe}</p>}
        <LabSelect name={copy.type} items={copy.names.map(title => ({ title }))}
          value={scenarioIds.indexOf(scenario)} disabled={busy} onChange={index => {
            const target = scenarioIds[index];
            if (mode === 'http' && !realScenarios.some(id => id === target)) setMode('simulation');
            setConfiguration(initial(target, realScenarios.some(id => id === target) ? mode : 'simulation'));
          }} />
        <LabSelect name={copy.endpoint} items={endpoints.map(path => ({ title: 'GET ' + path }))}
          value={endpoints.indexOf(endpoint)} disabled={busy} onChange={index => update({ endpoint: endpoints[index] })} />
        <fieldset className={styles.vus}>
          <legend>{copy.vus}</legend>
          <NumberField label={copy.vus} min={1} max={cap} value={vus} integer onChange={value => update({ vus: value })} />
          <input type="range" min={1} max={cap} value={vus} aria-label={copy.vus}
            style={{ backgroundImage: 'linear-gradient(to right, var(--perf-red) ' + (vus - 1) / (cap - 1) * 100 + '%, #34424b 0)' }}
            onChange={event => update({ vus: event.target.valueAsNumber })} />
          <div className={styles.ticks} aria-hidden="true">{(mode === 'http' ? [1, 2, 3] : [1, 25, 50, 100]).map(value => <span key={value}>{value}</span>)}</div>
        </fieldset>
        <fieldset className={styles.duration}><legend>{copy.duration}</legend>
          <div>{durations.map(seconds => <label key={seconds}>
            <input type="radio" name="performance-duration" disabled={mode === 'http' && seconds !== realLimits.duration} checked={duration === seconds} onChange={() => update({ duration: seconds })} />
            {durationLabel(seconds)}
          </label>)}</div>
        </fieldset>
        {scenario === 'custom' && mode === 'simulation' ? <LabSelect name={copy.profile} items={copy.profiles.map(title => ({ title }))}
          value={profiles.indexOf(profile)} disabled={false} onChange={index => update({ profile: profiles[index] })} />
          : <p>{copy.profile} · {copy.profiles[profiles.indexOf(profile)]}</p>}
        {scenario === 'soak' && <p className={styles.muted}>{copy.soak}</p>}
        <fieldset className={styles.thresholds}>
          <legend><Settings2 />{copy.thresholds}</legend>
          <div>{thresholdKeys.map((key, index) => <label key={key}>{copy.fields[index]}
            <NumberField label={copy.fields[index]} min={0} max={key === 'errors' ? 100 : undefined} value={thresholds[key]}
              onChange={value => setConfiguration(current => ({ ...current, thresholds: { ...current.thresholds, [key]: value } }))} />
          </label>)}</div>
        </fieldset>
      </fieldset>
      <div className={styles.summary} aria-live="polite">
        <h4><List />{copy.config}</h4><strong>{scenarioName(scenario)}</strong>
        <dl>
          <div><dt>VUs</dt><dd>{vus}</dd></div>
          <div><dt>{copy.metrics[5]}</dt><dd>{durationLabel(duration)}</dd></div>
          <div><dt>Endpoint</dt><dd>GET {endpoint}</dd></div>
          {criteria.map((row, index) => <div key={row.label}><dt>{row.label}</dt>
            <dd>{row.operator + withUnit(thresholds[thresholdKeys[index]], units[index])}</dd></div>)}
        </dl>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={busy || httpUnavailable} onClick={() => { setTab(0); void execution.execute(configuration, mode); }}><Play size={15} />{copy.run}</button>
        <button type="button" disabled={busy} onClick={() => setConfiguration(initial(scenario))}><RotateCcw size={15} />{copy.reset}</button>
        {busy && <button type="button" onClick={execution.interrupt}>{labels.stop}</button>}
      </div>
      {execution.error && <p role="alert">{message(execution.error)}</p>}
    </section>
    <section className={styles.panel + ' ' + styles.execution} aria-labelledby="performance-execution-title">
      <header><h3 id="performance-execution-title"><Play />{copy.execution}</h3>
        {execution.validation ? <span role="status">{labels.validating}</span> : <ExecutionStatus copy={copy} status={run?.status ?? 'waiting'} />}</header>
      {busy && <progress aria-label={copy.execution} max={run?.configuration.duration ?? duration} value={run?.elapsed ?? 0} />}
      <RestTabs id={tabId} label={copy.execution} tabs={copy.tabs} active={tab} onChange={setTab} />
      {copy.tabs.map((label, index) => <div key={label} id={tabId + '-panel-' + index} role="tabpanel"
        aria-labelledby={tabId + '-tab-' + index} hidden={tab !== index} tabIndex={0} className={styles.tabPanel}>
        {tab === index && index < 2 && run && <p className={styles.demo}><strong>{modeLabel(run.mode)}</strong> · {scenarioName(run.configuration.scenario)}
          {' · GET ' + run.configuration.endpoint}
          {run.mode === 'simulation' && ' · ' + labels.accelerated}{run.status === 'interrupted' && ' · ' + labels.partial}
          {run.processing !== undefined && ' · ' + labels.processing + ' ' + withUnit(run.processing, 's')}</p>}
        {tab === index && index === 0 && <>
          <dl className={styles.metrics}>{copy.metrics.map((metric, i) => {
            const Icon = metricIcons[i];
            return <div key={metric}><dt><Icon aria-hidden="true" />{metric}</dt><dd>{values[i]}</dd></div>;
          })}</dl>
          {metrics && <dl className={styles.detailMetrics}>
            {[withUnit(metrics.succeeded, ''), withUnit(metrics.failed, ''), withUnit(metrics.min, 'ms'), withUnit(metrics.max, 'ms'),
              withUnit(metrics.peak, ''), withUnit(metrics.checksPassed, ''), withUnit(metrics.checksFailed, '')].map((value, index) =>
              <div key={labels.extra[index]}><dt>{labels.extra[index]}</dt><dd>{value}</dd></div>)}
          </dl>}
          {metrics && Object.keys(metrics.statuses).length > 0 && <p>{labels.outcomes} · {Object.entries(metrics.statuses).map(([key, count]) =>
            (key === 'timeout' ? message('timeout') : key === 'network' ? message('networkFailure') : key) + ': ' + format(count)).join(' · ')}</p>}
          {metrics && metrics.size > 0 && metrics.size < 100 && <p className={styles.muted}>{labels.low}</p>}
          {responseChart}
          <div className={styles.distribution}>
            <h4>{copy.distribution}</h4><p>{copy.percentiles}</p>
            <dl>{(['p50', 'p90', 'p95', 'p99'] as const).map(key => <div key={key}>
              <dt>{key}</dt><dd className={styles.bar} aria-hidden="true"><span style={{ width: (metrics?.p99 ? (metrics[key] ?? 0) / metrics.p99 * 100 : 0) + '%' }} /></dd>
              <dd>{withUnit(metrics?.[key], 'ms')}</dd>
            </div>)}</dl>
          </div>
        </>}
        {tab === index && index === 1 && <div className={styles.chartGrid} key={scenario}>
          {responseChart}
          <PerformanceChart title={copy.metrics[1]} times={times} unit="req/s" format={format}
            series={[{ label: copy.metrics[1], values: points.map(point => point.throughput) }]} empty={labels.emptyChart} />
          <PerformanceChart title={copy.metrics[4]} times={times} unit="VU" format={format}
            series={[{ label: copy.metrics[4], values: points.map(point => point.vus) }]} empty={labels.emptyChart} />
          <PerformanceChart title={copy.metrics[2]} times={times} unit="%" format={format}
            series={[{ label: copy.metrics[2], values: points.map(point => point.errors) }]} empty={labels.emptyChart} />
        </div>}
        {tab === index && index === 2 && <ScriptViewer script={script} copy={copy} filename={filename} downloadLabel={labels.downloadScript}
          onDownload={() => exportFile(filename, script, 'text/javascript')} />}
        {tab === index && index === 3 && <PerformanceLogs key={run?.id} locale={locale} run={run} />}
      </div>)}
      {tab === 0 && run && <div className={styles.exportActions}>
        <button className={styles.utilityButton} type="button" disabled={busy}
          onClick={() => exportFile(buildPerformanceExportFilename(run, 'json'), exportJson(run, analysis), 'application/json')}>
          <Download size={15} aria-hidden="true" />{labels.exportJson}
        </button>
        <button className={styles.utilityButton} type="button" disabled={busy}
          onClick={() => exportFile(buildPerformanceExportFilename(run, 'csv'), exportCsv(run), 'text/csv')}>
          <Download size={15} aria-hidden="true" />{labels.exportCsv}
        </button>
      </div>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
    <div className={styles.reports}>
      <section className={styles.panel} aria-labelledby="performance-criteria">
        <header><h3 id="performance-criteria"><Settings2 />{copy.criteria}</h3>
          <span>{resultLabel(metrics?.result ?? 'pending')}</span></header>
        {run && <p className={styles.demo}>{modeLabel(run.mode)} · {labels.evaluated}</p>}
        <div className={styles.table}>
          <table><Columns labels={copy.criteriaColumns} /><tbody>{criteria.map(row => <tr key={row.label}>
            <th scope="row">{row.label}</th><td>{row.operator + row.expected}</td><td>{row.observed}</td>
            <td>{row.result === 'pass' || row.result === 'fail' ? <Status passed={row.result === 'pass'} /> : resultLabel(row.result)}</td>
          </tr>)}</tbody></table>
        </div>
        <div className={styles.analysis}>
          <h4>{metrics?.result === 'pass' ? <Check /> : <TriangleAlert />}{copy.analysis}</h4>
          {analysis.length ? analysis.map(item => <p key={item}>{item}</p>) : <p>{resultLabel(metrics?.result ?? 'pending')}</p>}
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="performance-comparison">
        <header><h3 id="performance-comparison"><BarChart3 />{copy.comparison}</h3>
          <button ref={historyButton} type="button" onClick={() => history.current?.showModal()}><History size={14} />{copy.history} ({records.length})</button></header>
        {selected.some(entry => !comparable(selected[0], entry)) && <p className={styles.demo}>{labels.distinct}</p>}
        {!selected.length && <p>{records.length ? labels.compare : copy.empty}</p>}
        <div className={styles.table}><table><Columns labels={copy.compareColumns} /><tbody>
          {selected.map(entry => {
            const m = report(entry);
            return <tr key={entry.id} data-current={run?.id === entry.id}><th scope="row">
              {scenarioName(entry.configuration.scenario)} · {modeLabel(entry.mode)}<br />{entry.configuration.endpoint}<br />
              {withUnit(entry.elapsed, 's')} · {m.requests} {copy.metrics[0]} · {withUnit(m.throughput, 'req/s')}{difference(entry, m.throughput, baselineMetrics?.throughput)}<br />
              {copy.average} {withUnit(m.average, 'ms')} · p99 {withUnit(m.p99, 'ms')}
              </th><td>{entry.configuration.vus}</td><td>{withUnit(m.p95, 'ms')}{difference(entry, m.p95, baselineMetrics?.p95)}</td>
              <td>{withUnit(m.errors, '%')}{difference(entry, m.errors, baselineMetrics?.errors)}</td><td>{resultLabel(m.result)}</td></tr>;
          })}
        </tbody></table></div>
      </section>
    </div>
    <dialog ref={history} className={styles.dialog} aria-labelledby="performance-history-title" onClose={() => historyButton.current?.focus()}>
      <h3 id="performance-history-title"><History />{copy.history}</h3>
      {execution.storageFailed && <p role="alert">{labels.storage}</p>}
      {records.length === 0 && <p>{copy.empty}</p>}
      {records.length > 0 && <button type="button" onClick={() => setDeletion('all')}>{labels.clear}</button>}
      <ul className={styles.historyList}>{records.map(entry => <li key={entry.id}>
        <strong>{scenarioName(entry.configuration.scenario)} · {modeLabel(entry.mode)}</strong>
        <p>{new Date(entry.startedAt).toLocaleString(locale)} · {entry.configuration.endpoint}<br />
          {withUnit(entry.elapsed, 's')} · {entry.configuration.vus} VUs · {copy.executionStatuses[entry.status]} · {resultLabel(report(entry).result)}</p>
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => { execution.show(entry); setTab(0); history.current?.close(); }}>{labels.details}</button>
          <button type="button" disabled={busy} onClick={() => {
            setMode(entry.mode); setConfiguration(structuredClone(entry.configuration)); history.current?.close();
          }}>{labels.restore}</button>
          <label><input type="checkbox" checked={selection.includes(entry.id)} disabled={!selection.includes(entry.id) && selected.length >= 3}
            onChange={event => setSelection(event.target.checked ? [...selected.map(item => item.id), entry.id] : selection.filter(id => id !== entry.id))} />{labels.compare}</label>
          <button type="button" onClick={() => setDeletion(entry.id)}>{labels.remove}</button>
        </div>
      </li>)}</ul>
      <form method="dialog"><button type="submit">{copy.close}</button></form>
    </dialog>
    <ConfirmDialog open={deletion !== null} title={labels.remove} description={labels.confirm} confirmLabel={labels.remove}
      cancelLabel={labels.cancel} variant="destructive" onCancel={() => setDeletion(null)} onConfirm={() => {
        execution.remove(deletion === 'all' ? undefined : deletion ?? undefined);
        setSelection(current => deletion === 'all' ? [] : current.filter(id => id !== deletion));
        setDeletion(null);
      }} />
  </div>;
}
