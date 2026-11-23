import { Play } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { authCopy } from '@/lib/test-lab/auth-copy';
import { authScenarioIds, type AuthCheck, type AuthRun } from '@/lib/test-lab/auth-runner';
import { authSnippets, previewCopy } from '@/lib/test-lab/preview';
import styles from './LabPreview.module.css';

export function AuthExecution({ locale, index, run, running, execute }: {
  locale: Locale; index: number; run?: AuthRun; running: boolean; execute: () => void;
}) {
  const copy = authCopy[locale];
  const preview = previewCopy[locale];
  const [objective, expected, plan] = copy.cases[index];
  const passed = run?.checks.filter(check => check.pass).length ?? 0;
  const failed = (run?.checks.length ?? 0) - passed;
  const status = run ? run.error ? 'error' : failed ? 'failed' : 'passed' : 'ready';
  const format = (value: AuthCheck['expected']) => typeof value === 'boolean' ? (value ? copy.yes : copy.no) : value;
  const formatLocale = locale === 'pt' ? 'pt-BR' : 'en-US';
  const groups = new Map<string, AuthCheck[]>();
  for (const check of run?.checks ?? []) {
    const group = groups.get(check.step);
    if (group) group.push(check);
    else groups.set(check.step, [check]);
  }

  return <>
    <div className={styles.details}>
      <h4>{authScenarioIds[index]} · {copy.objective}</h4>
      <p>{objective}</p>
      <p><strong>{copy.expected}</strong> · {expected}</p>
      <details><summary>{copy.plan}</summary><p>{copy.prerequisites} · {copy.demoApi}</p><p>{plan}</p></details>
    </div>
    <div className={styles.authExample}><h4>{copy.cypress}</h4><p>{copy.fake}</p></div>
    <pre className={styles.code}><code>{authSnippets[index]}</code></pre>
    <div className={styles.actions}>
      <button className={styles.authRun} type="button" disabled={running} onClick={execute}><Play size={16} aria-hidden="true" />{running ? copy.running : preview.run}</button>
      <span>{copy.executor}</span>
    </div>
    <div className={styles.notice} aria-busy={running}>
      <div className={styles.executionHeading}>
        <strong>{preview.result}</strong>
        <span role="status" className={styles.authStatus} data-status={status}>{running ? copy.running : copy[status]}</span>
      </div>
      {run && <>
        <p><strong>{preview.auth[run.scenario]}</strong></p>
        <p><time dateTime={run.timestamp}>{new Date(run.timestamp).toLocaleString(formatLocale)}</time> · {Math.round(run.duration)} ms</p>
        <p>{copy.checks} · {copy.passed}: {passed} · {copy.failed}: {failed}</p>
        {run.error && <p className={styles.authStatus} data-status="error">{copy.errors[run.error]}</p>}
        {[...groups].map(([step, checks]) => (
          <details className={styles.authStep} key={step} open={checks.some(check => !check.pass) || undefined}>
            <summary>{copy.steps[step as keyof typeof copy.steps]} · {checks[0].field === 'http' && `HTTP ${checks[0].observed} · `}{checks.every(check => check.pass) ? copy.passed : copy.failed}</summary>
            <ul role="list">{checks.map(check => <li key={check.field}>
              <strong>{copy.fields[check.field]}</strong> · {copy.expected}: {format(check.expected)} · {copy.observed}: {format(check.observed)} · <span className={styles.authStatus} data-status={check.pass ? 'passed' : 'failed'}>{check.pass ? copy.passed : copy.failed}</span>
            </li>)}</ul>
          </details>
        ))}
      </>}
    </div>
  </>;
}
