'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { Bug, ClipboardCheck, CodeXml, Gauge, List, LockKeyhole, Play } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { moduleIds, previewCopy, type ModuleId, type PreviewCopy } from '@/lib/test-lab/preview';
import { runAuthScenario, type AuthRun } from '@/lib/test-lab/auth-runner';
import { AuthExecution } from './AuthExecution';
import { RestLab } from './RestLab';
import { BugInvestigation } from './BugInvestigation';
import styles from './LabPreview.module.css';

const icons = { auth: LockKeyhole, api: CodeXml, bug: Bug, performance: Gauge, manual: ClipboardCheck };
const PerformanceWorkspace = lazy(() => import('./PerformanceWorkspace'));

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
  const [selectedAuth, setSelectedAuth] = useState(0);
  const [performanceOpened, setPerformanceOpened] = useState(false);
  const [authRun, setAuthRun] = useState<AuthRun>();
  const [authRunning, setAuthRunning] = useState(false);
  const authLock = useRef(false);
  function selectModule(id: ModuleId) {
    if (id === 'performance') setPerformanceOpened(true);
    setActive(id);
  }

  async function executeAuth() {
    if (authLock.current) return;
    authLock.current = true;
    setAuthRunning(true);
    setAuthRun(undefined);
    try { setAuthRun(await runAuthScenario(selectedAuth)); }
    finally { authLock.current = false; setAuthRunning(false); }
  }

  return <section className={`shell ${styles.workspace}`} aria-labelledby="lab-modules-title">
    <header className={styles.moduleHeading}><h2 id="lab-modules-title">{copy.moduleTitle}</h2><p>{copy.moduleHint}</p></header>
    <label className={styles.moduleSelect}>
      {copy.moduleSelect}
      <select id="lab-module-select" value={active} aria-controls="lab-workspace" onChange={event => selectModule(event.currentTarget.value as ModuleId)}>
        {moduleIds.map(id => <option key={id} value={id}>{copy.modules[id][0]}</option>)}
      </select>
    </label>
    <div className={styles.modules} role="group" aria-labelledby="lab-modules-title">
      {moduleIds.map(id => {
        const Icon = icons[id];
        const [title, description] = copy.modules[id];
        return <button key={id} type="button" aria-pressed={active === id} aria-controls="lab-workspace" onClick={() => selectModule(id)}>
          <Icon size={24} aria-hidden="true" />
          <span>
            <strong>{title}</strong>
            <span className={styles.moduleDescription}>{description}</span>
          </span>
        </button>;
      })}
    </div>
    <div id="lab-workspace">
      {active === 'auth' && <div className={styles.executionGrid}>
        <section className={styles.panel} aria-labelledby="lab-scenarios-title">
          <h3 id="lab-scenarios-title"><List size={18} aria-hidden="true" />{copy.scenarios}</h3>
          <ul className={styles.scenarios} role="list">
            {copy.auth.map((name, index) => <li key={name}>
              <button type="button" aria-pressed={selectedAuth === index} onClick={() => setSelectedAuth(index)}>{name}</button>
            </li>)}
          </ul>
        </section>
        <section className={styles.panel} aria-labelledby="lab-execution-title">
          <header className={styles.executionHeading}>
            <h3 id="lab-execution-title"><Play size={18} aria-hidden="true" />{copy.execution}</h3>
          </header>
          <h4 className={styles.scenarioTitle} aria-live="polite">{copy.auth[selectedAuth]}</h4>
          <AuthExecution locale={locale} index={selectedAuth} run={authRun?.scenario === selectedAuth ? authRun : undefined} running={authRunning} execute={() => void executeAuth()} />
        </section>
      </div>}
      <div hidden={active !== 'bug'}><BugInvestigation locale={locale} /></div>
      <div hidden={active !== 'api'}><RestLab locale={locale} /></div>
      {performanceOpened && <div hidden={active !== 'performance'}>
        <Suspense fallback={null}><PerformanceWorkspace locale={locale} /></Suspense>
      </div>}
      <div hidden={active !== 'manual'}>
        <header className={styles.executionHeading}>
          <h3>{copy.modules.manual[0]}</h3><div className={styles.badges}><span>{copy.demo}</span></div>
        </header>
        <ManualPreview copy={copy.manual} upcoming={copy.upcoming} />
      </div>
    </div>
  </section>;
}

