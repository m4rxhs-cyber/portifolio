import { useState } from 'react';
import { CheckCircle2, Circle, CircleAlert, FileText } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { InvestigationActions } from '@/lib/test-lab/investigation-actions';
import type { InvestigationCase, InvestigationCopy } from '@/lib/test-lab/investigation';
import { emptyDraft, exampleDraft, type BugDraft } from '@/lib/test-lab/investigation-model';
import type { ReportEvaluation } from '@/lib/test-lab/investigation-score';
import styles from './BugInvestigation.module.css';

export function BugReportDraft({ copy, actions, scenario, draft, change, validate, captured }: {
  copy: InvestigationCopy; actions: InvestigationActions; scenario: InvestigationCase; draft: BugDraft;
  change: (draft: BugDraft) => void; validate: () => void; captured: boolean;
}) {
  const [replacement, setReplacement] = useState<'clear' | 'restore'>();
  const example = exampleDraft(scenario, copy.web);
  const { fields } = copy;
  const update = (key: keyof BugDraft, value: string) => change({ ...draft, [key]: value });

  function replace(action: 'clear' | 'restore') {
    const target = action === 'clear' ? emptyDraft : example;
    if (Object.keys(draft).every(key => draft[key as keyof BugDraft] === target[key as keyof BugDraft])) return;
    const edited = JSON.stringify(draft) !== JSON.stringify(example) && JSON.stringify(draft) !== JSON.stringify(emptyDraft);
    if (edited) setReplacement(action);
    else change(target);
  }

  return <section className={styles.panel} aria-labelledby="bug-report-title">
    <h3 id="bug-report-title"><FileText size={18} aria-hidden="true" />{copy.report}</h3>
    <p>{copy.reportIntro}</p>
    <form className={styles.report} noValidate onSubmit={event => { event.preventDefault(); validate(); }}>
      <label>{fields.title}<input required value={draft.title} onChange={event => update('title', event.currentTarget.value)} /></label>
      <div className={styles.reportGrid}>
        {(['severity', 'priority'] as const).map(key => <label key={key}>{fields[key]}
          <select required value={draft[key]} onChange={event => update(key, event.currentTarget.value)}>
            <option value="">—</option>
            {Object.entries(copy[key]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>)}
        {(['environment', 'module'] as const).map(key => <label key={key}>{fields[key]}
          <input required value={draft[key]} onChange={event => update(key, event.currentTarget.value)} />
        </label>)}
      </div>
      {(['steps', 'expected', 'observed', 'evidence'] as const).map(key => <label key={key}>{fields[key]}
        <textarea required={key !== 'evidence'} rows={key === 'steps' ? 4 : 2} value={draft[key]} onChange={event => update(key, event.currentTarget.value)} />
      </label>)}
      {captured && <p>{actions.captured} · {scenario.id}</p>}
      <div className={styles.actions}>
        <button type="button" onClick={() => replace('clear')}>{actions.clear}</button>
        <button type="button" onClick={() => replace('restore')}>{actions.restore}</button>
        <button type="submit" className={styles.validate}>{copy.validate}</button>
      </div>
    </form>
    <ConfirmDialog open={!!replacement} title={replacement === 'restore' ? actions.restore : actions.clear}
      description={actions.discard} confirmLabel={replacement === 'restore' ? actions.restore : actions.clear}
      cancelLabel={actions.cancel} variant="destructive" onCancel={() => setReplacement(undefined)}
      onConfirm={() => { change(replacement === 'restore' ? example : emptyDraft); setReplacement(undefined); }} />
  </section>;
}

export function ReportQualityPanel({ copy, actions, result, stale }: {
  copy: InvestigationCopy; actions: InvestigationActions; result?: ReportEvaluation; stale: boolean;
}) {
  return <section className={styles.panel} aria-labelledby="bug-quality-title">
    <h3 id="bug-quality-title">{copy.quality}</h3>
    <div role="status" aria-atomic="true">
      <div className={styles.qualityIndicator} data-level={result?.level}>
        {result ? <><strong>{result.score}/100</strong><span>{actions.levels[result.level]}</span></> : copy.waiting}
      </div>
      {result && <p>{actions.completed}</p>}
      {stale && <p>{actions.edited}</p>}
    </div>
    <ul className={styles.criteria} role="list">
      {copy.criteria.map((criterion, index) => {
        const item = result?.criteria[index];
        const Icon = !item ? Circle : item.met ? CheckCircle2 : CircleAlert;
        return <li key={criterion}><Icon size={14} aria-hidden="true" /><div>
          <strong>{criterion}</strong>
          <p>{item ? `${item.met ? actions.met : actions.improve} · ${item.points}/${item.max}` : actions.pending}</p>
          {item && !item.met && <p>{actions.guidance[index]}</p>}
        </div></li>;
      })}
    </ul>
    {result && <div className={styles.aboutResult}>
      {result.criteria.some(item => item.met) && <><h4>{actions.positives}</h4><p>{copy.criteria.filter((_, index) => result.criteria[index].met).join(' · ')}</p></>}
      {result.criteria.some(item => !item.met) && <><h4>{actions.opportunities}</h4><p>{copy.criteria.filter((_, index) => !result.criteria[index].met).join(' · ')}</p></>}
      <p>{actions.limits}</p>
    </div>}
  </section>;
}
