import { useState } from 'react';
import { Bug, Info, List } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { investigation } from '@/lib/test-lab/investigation';
import { investigationActions } from '@/lib/test-lab/investigation-actions';
import { exampleDraft, type BugDraft, type Evidence, type ScenarioId } from '@/lib/test-lab/investigation-model';
import { evaluateBugReport, type ReportEvaluation } from '@/lib/test-lab/investigation-score';
import { BugReportDraft, ReportQualityPanel } from './BugReportDraft';
import { InvestigationDemo } from './InvestigationDemos';
import { InvestigationEvidence } from './InvestigationEvidence';
import { RestTabs } from './RestTabs';
import styles from './BugInvestigation.module.css';

export function BugInvestigation({ locale }: { locale: Locale }) {
  const copy = investigation[locale];
  const actions = investigationActions[locale];
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState(0);
  const [drafts, setDrafts] = useState<Partial<Record<ScenarioId, BugDraft>>>({});
  const [evidenceByScenario, setEvidence] = useState<Partial<Record<ScenarioId, Evidence>>>({});
  const [evaluations, setEvaluations] = useState<Partial<Record<ScenarioId, { result: ReportEvaluation; draft: BugDraft; evidence?: Evidence }>>>({});
  const scenario = copy.cases[selected];
  const draft = drafts[scenario.id] ?? exampleDraft(scenario, copy.web);
  const evidence = evidenceByScenario[scenario.id];
  const evaluation = evaluations[scenario.id];
  const stale = !!evaluation && (JSON.stringify(evaluation.draft) !== JSON.stringify(draft) || evaluation.evidence !== evidence);

  function record(item: Evidence) {
    setEvidence(previous => ({ ...previous, [item.scenario]: item }));
  }

  function chooseScenario(index: number) {
    setSelected(index);
    setTab(0);
  }

  return <div className={styles.layout}>
    <section className={styles.panel} aria-labelledby="bug-scenarios-title">
      <h3 id="bug-scenarios-title"><List size={18} aria-hidden="true" />{copy.scenarios}</h3>
      <p>{copy.choose}</p>
      <select className={styles.scenarioSelect} value={selected} aria-labelledby="bug-scenarios-title" onChange={event => chooseScenario(Number(event.currentTarget.value))}>
        {copy.cases.map((item, index) => <option key={item.id} value={index}>{item.id} · {item.title}</option>)}
      </select>
      <ul className={styles.scenarios} role="list">
        {copy.cases.map((item, index) => <li key={item.id}>
          <button type="button" aria-pressed={selected === index} onClick={() => chooseScenario(index)}>
            <span className={styles.caseId}>{item.id}</span>
            <span className={styles.badge} data-severity={item.severity}>{copy.severity[item.severity]}</span>
            <strong>{item.title}</strong>
          </button>
        </li>)}
      </ul>
      <div className={styles.about}><h4><Info size={15} aria-hidden="true" />{copy.about}</h4><p>{copy.aboutText}</p></div>
    </section>
    <section className={styles.panel} aria-labelledby="bug-investigation-title">
      <h3 id="bug-investigation-title"><Bug size={19} aria-hidden="true" />Bug Investigation</h3>
      <p>{copy.intro}</p>
      <div className={styles.summary} aria-live="polite">
        <div className={styles.summaryMeta}>
          <strong className={styles.accent}>{scenario.id}</strong><span className={styles.badge}>{copy.demo}</span>
        </div>
        <h4>{scenario.title}</h4>
        <p>{scenario.description}</p>
        <div className={styles.summaryMeta}>
          <span className={styles.badge} data-severity={scenario.severity}>{copy.fields.severity}: {copy.severity[scenario.severity]}</span>
          <span className={styles.badge}>{copy.fields.module}: {scenario.module}</span>
        </div>
      </div>
      <RestTabs id="bug-investigation" label="Bug Investigation" tabs={copy.tabs} active={tab} onChange={setTab} />
      {copy.tabs.map((label, index) => <div key={label} className={styles.tabContent} role="tabpanel" id={`bug-investigation-panel-${index}`} aria-labelledby={`bug-investigation-tab-${index}`} hidden={tab !== index} tabIndex={0}>
        {index === 0 && <>
          {copy.cases.map(item => <div key={item.id} hidden={item.id !== scenario.id}>
            <InvestigationDemo id={item.id} copy={copy} actions={actions} locale={locale} record={record} />
          </div>)}
          {evidence && <div className={styles.observed}><h5><Info size={16} aria-hidden="true" />{actions.captured}</h5><p>{scenario.id === 'BUG-003' ? copy.comparison.mismatch : scenario.description}</p>
            <button type="button" onClick={() => { setTab(2); document.getElementById('bug-investigation-tab-2')?.focus(); }}>{copy.tabs[2]}</button>
          </div>}
        </>}
        {index === 1 && <ol>{scenario.steps.map(step => <li key={step}>{step}</li>)}</ol>}
        {index === 2 && <InvestigationEvidence key={evidence?.id ?? scenario.id} evidence={evidence} scenario={scenario} copy={copy} actions={actions} locale={locale} />}
        {index === 3 && <ul>{scenario.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>}
      </div>)}
    </section>
    <div className={styles.reporting}>
    <BugReportDraft key={scenario.id} copy={copy} actions={actions} scenario={scenario} draft={draft} captured={!!evidence}
      change={value => setDrafts(previous => ({ ...previous, [scenario.id]: value }))}
      validate={() => setEvaluations(previous => ({ ...previous, [scenario.id]: { result: evaluateBugReport(scenario, draft, evidence), draft, evidence } }))} />
    <ReportQualityPanel copy={copy} actions={actions} result={stale ? undefined : evaluation?.result} stale={stale} />
    </div>
  </div>;
}

