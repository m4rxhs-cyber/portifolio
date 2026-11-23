import { useState } from 'react';
import type { Locale } from '@/lib/content';
import type { InvestigationCase, InvestigationCopy } from '@/lib/test-lab/investigation';
import type { InvestigationActions } from '@/lib/test-lab/investigation-actions';
import type { Evidence } from '@/lib/test-lab/investigation-model';
import { money } from './InvestigationDemos';
import styles from './BugInvestigation.module.css';

export function InvestigationEvidence({ evidence, scenario, copy, actions, locale }: {
  evidence?: Evidence; scenario: InvestigationCase; copy: InvestigationCopy; actions: InvestigationActions; locale: Locale;
}) {
  const [feedback, setFeedback] = useState('');
  if (!evidence) return <p>{actions.empty}</p>;
  const rows: [string, string][] = [[actions.date, new Date(evidence.at).toLocaleString(locale === 'pt' ? 'pt-BR' : 'en-US')]];
  if (evidence.scenario === 'BUG-001') {
    const data = evidence.data;
    rows.push([copy.store.quantity, String(data.quantity)], [actions.unit, money(locale, data.unitPrice)], [copy.store.coupon, data.coupon],
      [copy.store.subtotal, money(locale, data.subtotal)], [copy.store.discount + ' (10%)', money(locale, data.discount)],
      [copy.fields.expected, money(locale, data.expected)], [copy.fields.observed, money(locale, data.observed)], [actions.difference, money(locale, data.difference)]);
  } else if (evidence.scenario === 'BUG-002') {
    rows.push([copy.registration.email, evidence.data.example], [copy.fields.expected, scenario.expected], [copy.fields.observed, actions.accepted]);
  } else {
    const data = evidence.data;
    const values = [data.endpoint, data.method, String(data.status), JSON.stringify(data.api, null, 2), JSON.stringify(data.ui, null, 2), data.field];
    rows.push(...actions.apiLabels.map((label, index): [string, string] => [label, values[index]]),
      [copy.fields.expected, scenario.expected], [copy.fields.observed, scenario.observed]);
  }
  return <>
    <p><strong>{actions.captured}</strong> · {evidence.scenario}</p>
    <dl className={styles.evidence}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className={styles.actions}><button type="button" onClick={async () => {
      try {
        await navigator.clipboard.writeText([evidence.scenario, ...rows.map(([label, value]) => label + ': ' + value)].join('\n'));
        setFeedback(actions.copied);
      } catch { setFeedback(actions.copyError); }
    }}>{actions.copy}</button><p role="status">{feedback}</p></div>
  </>;
}
