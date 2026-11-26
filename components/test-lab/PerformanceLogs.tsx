import { useEffect, useId, useState } from 'react';
import { Check, Clipboard, Terminal } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { performanceCopy } from '@/lib/test-lab/performance-copy';
import { runCopy } from '@/lib/test-lab/performance-run-copy';
import type { Log, Run } from '@/lib/test-lab/performance-run';
import { LabSelect } from './LabSelect';
import styles from './PerformanceWorkspace.module.css';

const levels = ['INFO', 'WARN', 'ERROR', 'PASS', 'FAIL'] as const;
const groups = [['t'], ['capacity', 'demand'], ['utilization', 'queue', 'processed'], ['503', '500', 'timeouts', 'cancelled']] as const;
const keys = groups.flat();

function fields(detail: string) {
  const parts = detail.split(' · ');
  if (parts.length !== keys.length || !keys.every((key, i) => parts[i].startsWith(key + '=') && parts[i].length > key.length + 1)) return;
  return Object.fromEntries(keys.map((key, i) => [key, parts[i].slice(key.length + 1)]));
}

export function PerformanceLogs({ locale, run }: { locale: Locale; run?: Run }) {
  const copy = performanceCopy[locale];
  const labels = runCopy[locale];
  const explorer = labels.logExplorer;
  const id = useId();
  const [filter, setFilter] = useState(0);
  const [feedback, setFeedback] = useState<'copied' | 'error'>();
  const logs = run?.logs ?? [];
  const rows = filter ? logs.filter(entry => entry.level === levels[filter - 1]) : logs;
  const choices = [explorer.all, ...levels];
  const format = new Intl.NumberFormat(locale);
  const message = (key: string) => labels.messages[key as keyof typeof labels.messages] ?? labels.messages.internal;
  const prefix = (entry: Log) => entry.message === 'saturation' ? labels.saturation : entry.message === 'recovery' ? labels.recovery : '';
  const original = (entry: Log) => entry.detail ? [prefix(entry), entry.detail].filter(Boolean).join(' · ') : message(entry.message);

  useEffect(() => {
    if (feedback !== 'copied') return;
    const timer = setTimeout(() => setFeedback(undefined), 2000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return <section className={styles.log} aria-labelledby={id}>
    <div className={styles.logToolbar}>
      <div><h4 id={id}><Terminal aria-hidden="true" />{explorer.title}</h4>
        {run && <p aria-live="polite">{format.format(rows.length)} / {format.format(logs.length)} {explorer.records} · {copy.executionStatuses[run.status]}</p>}
      </div>
      <button className={styles.utilityButton} type="button" disabled={!logs.length} onClick={async () => {
        try {
          await navigator.clipboard.writeText(logs.map(entry => [entry.time, entry.level, run?.id,
            entry.criterion ?? '', original(entry)].join(' ')).join('\n'));
          setFeedback('copied');
        } catch { setFeedback('error'); }
      }}>
        {feedback === 'copied' ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}
        {feedback === 'copied' ? explorer.copied : labels.copyLogs}
      </button>
    </div>
    {feedback && <p className={styles.logFeedback} role="status">{feedback === 'copied' ? explorer.copied : explorer.copyError}</p>}
    <div className={styles.logFilterButtons} role="group" aria-label={explorer.filter}>
      {choices.map((title, index) => <button className={styles.utilityButton} type="button" key={title}
        aria-pressed={filter === index} onClick={() => setFilter(index)}>{title}</button>)}
    </div>
    <div className={styles.logFilterSelect}>
      <LabSelect name={explorer.filter} items={choices.map(title => ({ title }))} value={filter} disabled={!run} onChange={setFilter} />
    </div>
    {rows.length ? <div className={styles.logScroll} role="region" aria-labelledby={id} tabIndex={0}>
      <table className={styles.logTable}>
        <thead><tr>{copy.logColumns.map((title, index) => <th key={title} scope="col" className={index === 2 ? styles.logEvent : undefined}>
          {title}{index === 0 && ' (UTC)'}
        </th>)}</tr></thead>
        <tbody>{rows.map((entry, index) => {
          const technical = entry.detail ? fields(entry.detail) : undefined;
          return <tr key={index}>
            <td><time dateTime={entry.time} title={entry.time} aria-label={entry.time} tabIndex={0}>{entry.time.slice(11, 23)}</time></td>
            <td><span className={styles.logLevel} data-level={entry.level}>{entry.level}</span></td>
            <td className={styles.logEvent}>{entry.criterion ?? '—'}</td>
            <td><div className={styles.logMessage}>
              {entry.criterion && <span className={styles.inlineEvent}>{copy.logColumns[2]} · {entry.criterion}</span>}
              {technical ? <>
                {prefix(entry) && <span>{prefix(entry)}</span>}
                {groups.map(group => <span className={styles.logTechnical} key={group[0]}>{group.map(key =>
                  explorer.fields[key] + (key === 't' ? '=' : ': ') + technical[key]).join(' · ')}</span>)}
              </> : original(entry)}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div> : <p className={styles.logEmpty}>{run ? explorer.empty : copy.noLogs}</p>}
  </section>;
}
