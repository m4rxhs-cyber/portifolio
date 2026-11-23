'use client';

import { useRef, useState } from 'react';
import { Bug, ClipboardCheck, CodeXml, Gauge, List, LockKeyhole, Play } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { moduleIds, performanceFixtures, previewCopy, type ModuleId, type PreviewCopy } from '@/lib/test-lab/preview';
import { runAuthScenario, type AuthRun } from '@/lib/test-lab/auth-runner';
import { AuthExecution } from './AuthExecution';
import { RestLab } from './RestLab';
import { BugInvestigation } from './BugInvestigation';
import styles from './LabPreview.module.css';

const icons = { auth: LockKeyhole, api: CodeXml, bug: Bug, performance: Gauge, manual: ClipboardCheck };

function PerformancePreview({ copy, index, locale }: { copy: PreviewCopy; index: number; locale: Locale }) {
  const { requests, errors, median, p95, p99 } = performanceFixtures[index];
  const numberLocale = locale === 'pt' ? 'pt-BR' : 'en-US';
  return <>
    <dl className={styles.metrics}>
      <div><dt>{copy.performance.metrics[0]}</dt><dd>{requests.toLocaleString(numberLocale)}</dd></div>
      <div><dt>{copy.performance.metrics[1]}</dt><dd>{errors.toLocaleString(numberLocale, { style: 'percent', maximumFractionDigits: 1 })}</dd></div>
    </dl>
    <div className={styles.details}>
      <h4>{copy.performance.latency}</h4>
      <dl className={styles.chart}>
        {([['p50', median], ['p95', p95], ['p99', p99]] as const).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd><span aria-hidden="true" style={{ width: `${value / 6}%` }} /></dd><dd>{value} ms</dd></div>
        ))}
      </dl>
    </div>
    <p className={styles.notice}>{copy.performance.note}</p>
  </>;
}

function ManualPreview({ copy, upcoming }: { copy: PreviewCopy['manual']; upcoming: string }) {
  return <div className={styles.manualGrid}>
    <section className={styles.panel}>
      <h3>{copy.scenario} <small>{copy.caseId}</small></h3>
      <p>{copy.objective}</p>
      <div className={styles.details}><h4>{copy.preconditions}</h4><p>{copy.precondition}</p></div>
      <div className={styles.details}><h4>{copy.criteria}</h4><ul>{copy.acceptance.map(item => <li key={item}>{item}</li>)}</ul></div>
      <div className={styles.details}><h4>{copy.steps}</h4><ol>{copy.instructions.map(item => <li key={item}>{item}</li>)}</ol></div>
    </section>
    <section className={styles.panel}>
      <h3>{copy.environment}</h3>
      <p>{copy.form}</p>
      <div className={styles.fields}>
        <label>{copy.name}<input placeholder={copy.namePlaceholder} autoComplete="off" /></label>
        <label>{copy.email}<input type="email" placeholder={copy.emailPlaceholder} autoComplete="off" /></label>
        <div className={styles.actions}><button type="button" disabled>{copy.submit}</button><span>{upcoming}</span></div>
        <p className={styles.notice}>{copy.validation}</p>
      </div>
    </section>
    <section className={`${styles.panel} ${styles.record}`}>
      <h3>{copy.record}</h3>
      <p>{copy.draft}</p>
      <div className={`${styles.split} ${styles.fields}`}>
        <label>{copy.observed}<textarea rows={3} /></label>
        <fieldset>
          <legend>{copy.status}</legend>
          {copy.statuses.map((status, index) => <label key={status}><input type="radio" name="manual-preview-status" defaultChecked={index === 2} />{status}</label>)}
        </fieldset>
        <label>{copy.evidence}<textarea rows={2} /></label>
      </div>
    </section>
  </div>;
}

export function LabPreview({ locale }: { locale: Locale }) {
  const copy = previewCopy[locale];
  const [active, setActive] = useState<ModuleId>('auth');
  const [selected, setSelected] = useState({ auth: 0, performance: 0 });
  const [authRun, setAuthRun] = useState<AuthRun>();
  const [authRunning, setAuthRunning] = useState(false);
  const authLock = useRef(false);
  const names = { auth: copy.auth, performance: copy.performance.names };

  async function executeAuth() {
    if (authLock.current) return;
    authLock.current = true;
    setAuthRunning(true);
    setAuthRun(undefined);
    try { setAuthRun(await runAuthScenario(selected.auth)); }
    finally { authLock.current = false; setAuthRunning(false); }
  }

  return <section className={`shell ${styles.workspace}`} aria-labelledby="lab-modules-title">
    <header className={styles.moduleHeading}><h2 id="lab-modules-title">{copy.moduleTitle}</h2><p>{copy.moduleHint}</p></header>
    <label className={styles.moduleSelect}>
      {copy.moduleSelect}
      <select id="lab-module-select" value={active} aria-controls="lab-workspace" onChange={event => setActive(event.currentTarget.value as ModuleId)}>
        {moduleIds.map(id => <option key={id} value={id}>{copy.modules[id][0]}</option>)}
      </select>
    </label>
    <div className={styles.modules} role="group" aria-labelledby="lab-modules-title">
      {moduleIds.map(id => {
        const Icon = icons[id];
        const [title, description] = copy.modules[id];
        return <button key={id} type="button" aria-pressed={active === id} aria-controls="lab-workspace" onClick={() => setActive(id)}>
          <Icon size={24} aria-hidden="true" />
          <span>
            <strong>{title}</strong>
            <span className={styles.moduleDescription}>{description}</span>
          </span>
        </button>;
      })}
    </div>
    <div id="lab-workspace">
      {(active === 'auth' || active === 'performance') && <div className={styles.executionGrid}>
        <section className={styles.panel} aria-labelledby="lab-scenarios-title">
          <h3 id="lab-scenarios-title"><List size={18} aria-hidden="true" />{copy.scenarios}</h3>
          <ul className={styles.scenarios} role="list">
            {names[active].map((name, index) => <li key={name}>
              <button type="button" aria-pressed={selected[active] === index} onClick={() => setSelected({ ...selected, [active]: index })}>{name}</button>
            </li>)}
          </ul>
        </section>
        <section className={styles.panel} aria-labelledby="lab-execution-title">
          <header className={styles.executionHeading}>
            <h3 id="lab-execution-title"><Play size={18} aria-hidden="true" />{copy.execution}</h3>
            {active === 'performance' && <div className={styles.badges}><span>k6</span><span>{copy.demo}</span></div>}
          </header>
          <h4 className={styles.scenarioTitle} aria-live="polite">{names[active][selected[active]]}</h4>
          {active === 'auth'
            ? <AuthExecution locale={locale} index={selected.auth} run={authRun?.scenario === selected.auth ? authRun : undefined} running={authRunning} execute={() => void executeAuth()} />
            : <PerformancePreview copy={copy} index={selected.performance} locale={locale} />}
        </section>
      </div>}
      <div hidden={active !== 'bug'}><BugInvestigation locale={locale} /></div>
      <div hidden={active !== 'api'}><RestLab locale={locale} /></div>
      <div hidden={active !== 'manual'}>
        <header className={styles.executionHeading}>
          <h3>{copy.modules.manual[0]}</h3><div className={styles.badges}><span>{copy.demo}</span></div>
        </header>
        <ManualPreview copy={copy.manual} upcoming={copy.upcoming} />
      </div>
    </div>
  </section>;
}

