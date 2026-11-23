import { useEffect, useRef, useState } from 'react';
import { CodeXml, List, Play } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Locale } from '@/lib/content';
import { restCopy } from '@/lib/test-lab/rest-copy';
import { endpointPath } from '@/lib/test-lab/rest-client';
import { runRestScenario, scenarioIds, scenarioRequests, type RestRun } from '@/lib/test-lab/rest-scenarios';
import { RestBuilder, type RestBuilderHandle, type ScenarioImport } from './RestBuilder';
import { RestChecks, RestResponse } from './RestReport';
import styles from './LabPreview.module.css';
import layout from './RestWorkspace.module.css';

const exampleStatuses = [200, 201, 200, 404, 422, 409, 200, 404];
const scenarioMethods = ['GET', 'POST', 'PATCH', 'GET', 'POST', 'POST', 'GET', 'CRUD'];

export function RestLab({ locale }: { locale: Locale }) {
  const copy = restCopy[locale];
  const [mode, setMode] = useState(0);
  const [index, setIndex] = useState(0);
  const [report, setReport] = useState<{ index: number; run: RestRun }>();
  const [running, setRunning] = useState(false);
  const [chosenStep, setChosenStep] = useState({ scenario: 0, index: 0 });
  const [pendingImport, setPendingImport] = useState<ScenarioImport>();
  const [importMessage, setImportMessage] = useState('');
  const busy = useRef(false);
  const builder = useRef<RestBuilderHandle>(null);
  const builderMode = useRef<HTMLButtonElement>(null);
  const focusAfterImport = useRef(false);
  const [name, objective, expected, plan] = copy.cases[index];
  const run = report?.index === index ? report.run : undefined;
  const checks = run?.steps.flatMap(step => step.checks) ?? [];
  const status = run?.error ? 'error' : checks.some(check => !check.pass) ? 'failed' : run ? 'passed' : 'ready';
  const statusText = running ? copy.running : status === 'error' ? copy.technical : copy[status];
  const requests = scenarioRequests[index];
  const step = chosenStep.scenario === index ? chosenStep.index : 0;

  useEffect(() => {
    if (mode === 1 && focusAfterImport.current) {
      focusAfterImport.current = false;
      builderMode.current?.focus();
    }
  }, [mode]);

  function applyImport(request: ScenarioImport) {
    builder.current?.load(request);
    focusAfterImport.current = true;
    setPendingImport(undefined); setMode(1);
  }

  function importScenario() {
    setImportMessage('');
    if (builder.current?.isBusy()) { setImportMessage(copy.running); return; }
    const request = { ...requests[step], label: `${scenarioIds[index]} / ${name}${requests.length > 1 ? ` · ${copy.step} ${step + 1}` : ''}` };
    if (builder.current?.isDirty()) setPendingImport(request); else applyImport(request);
  }

  async function execute() {
    if (busy.current) return;
    busy.current = true; setRunning(true); setReport(undefined);
    try { setReport({ index, run: await runRestScenario(index) }); }
    finally { busy.current = false; setRunning(false); }
  }

  return <section className={layout.workspace} aria-labelledby="rest-title" data-builder={mode === 1}>
    <aside className={`${layout.surface} ${layout.sidebar}`} aria-labelledby="rest-case-list">
      <h3 id="rest-case-list"><List size={18} aria-hidden="true" />{copy.scenarios}</h3>
      <p>{copy.scenarioHint}</p>
      <ul className={layout.cases} role="list">{copy.cases.map(([label], value) => <li key={scenarioIds[value]}>
        <button type="button" aria-pressed={index === value} aria-controls="rest-scenarios" onClick={() => setIndex(value)}>
          <span><small>{scenarioIds[value]}</small><strong>{label}</strong></span>
          <span className={layout.methodBadge} data-method={scenarioMethods[value]}>{scenarioMethods[value]}</span>
        </button>
      </li>)}</ul>
    </aside>
    <div className={`${layout.surface} ${layout.main}`}>
      <header className={layout.moduleIntro}>
        <h3 id="rest-title"><CodeXml size={20} aria-hidden="true" />{copy.title}</h3>
        <p>{copy.intro}</p>
      </header>
      <div className={layout.modes} role="group" aria-label={copy.modeLabel}>
        {copy.modes.map((label, value) => {
          const Icon = value === 0 ? List : Play;
          return <button key={label} ref={value === 1 ? builderMode : undefined} type="button" aria-pressed={mode === value} aria-controls={value === 0 ? 'rest-scenarios' : 'rest-builder'} onClick={() => setMode(value)}><Icon size={16} aria-hidden="true" />{label}</button>;
        })}
      </div>
    <div id="rest-scenarios" hidden={mode !== 0}>
        <label className={layout.mobileCase}>{copy.scenarios}
          <select value={index} onChange={event => setIndex(Number(event.target.value))}>
            {copy.cases.map(([label], value) => <option key={scenarioIds[value]} value={value}>{scenarioIds[value]} · {label}</option>)}
          </select>
        </label>
        <section className={styles.panel}>
          <h3>{scenarioIds[index]} · {name}</h3>
          <p><strong>{copy.objective}</strong> · {objective}</p>
          <p><strong>{copy.expected}</strong> · {expected}</p>
          <details className={styles.details}><summary>{copy.plan}</summary><p>{plan}</p></details>
          <h4 className={styles.authExample}>{copy.example}</h4>
          <pre className={styles.code}><code>{`pm.test('${scenarioIds[index]}', () => {\n  pm.response.to.have.status(${exampleStatuses[index]});\n});`}</code></pre>
          <div className={styles.actions}><button className={styles.authRun} type="button" disabled={running} onClick={() => void execute()}>{copy.run}</button><span>{copy.actual}</span></div>
          <div className={layout.importActions}>
            {requests.length > 1 && <label>{copy.importStep}<select value={step} onChange={event => setChosenStep({ scenario: index, index: Number(event.target.value) })}>
              {requests.map(({ operation }, ordinal) => <option key={ordinal} value={ordinal}>{ordinal + 1} · {operation.method} /{endpointPath(operation.endpoint, operation.id)}</option>)}
            </select></label>}
            <button className={layout.secondary} type="button" onClick={importScenario}>{copy.loadBuilder}</button>
          </div>
          {importMessage && <p role="status">{importMessage}</p>}
          <div className={styles.notice} aria-busy={running}>
            <div className={styles.executionHeading}><strong>{copy.result}</strong><span role="status" className={styles.authStatus} data-status={status}>{statusText}</span></div>
            {run && <>
              <p>{scenarioIds[index]} · {name}</p>
              <p><time dateTime={run.timestamp}>{new Date(run.timestamp).toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US')}</time> · {Math.round(run.duration)} ms</p>
              <p>{copy.count(checks.filter(check => check.pass).length, checks.length)}</p>
              {run.error && <p className={styles.authStatus} data-status="error">{copy.errors[run.error]} {run.httpStatus ? `HTTP ${run.httpStatus}` : ''}</p>}
              {run.steps.map((step, ordinal) => <details key={ordinal} className={styles.authStep} open={step.checks.some(check => !check.pass) || undefined}>
                <summary>{step.operation.method} /{endpointPath(step.operation.endpoint, step.operation.id)} · HTTP {step.reply.status}</summary>
                <RestChecks checks={step.checks} copy={copy} /><RestResponse reply={step.reply} copy={copy} />
              </details>)}
            </>}
          </div>
        </section>
    </div>
    <div id="rest-builder" hidden={mode !== 1}><RestBuilder copy={copy} locale={locale} ref={builder} /></div>
    <ConfirmDialog open={Boolean(pendingImport)} title={copy.unsaved} description={copy.discardHint} confirmLabel={copy.discard}
      cancelLabel={copy.cancel} variant="destructive" onCancel={() => setPendingImport(undefined)} onConfirm={() => { if (pendingImport) applyImport(pendingImport); }} />
    </div>
  </section>;
}
