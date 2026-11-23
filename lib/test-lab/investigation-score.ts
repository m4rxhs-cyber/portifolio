import type { InvestigationCase } from './investigation';
import type { BugDraft, Evidence } from './investigation-model';

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const rubrics = {
  'BUG-001': {
    context: /checkout|pedido|order|cupom|coupon/,
    symptom: /desconto|discount|total/,
    sequence: [/headset|produto|product|store|loja/, /teste10/, /compar|verifi|check/],
    expected: /desconto|discount|10%/,
  },
  'BUG-002': {
    context: /cadastro|registration|form/,
    symptom: /valid|aceit|accept|email|e-mail/,
    sequence: [/usuario-sem-arroba/, /senha|password/, /envie|enviar|submit|send/],
    expected: /rejeit|reject|bloque|block|imped/,
  },
  'BUG-003': {
    context: /interface|\bui\b|api/,
    symptom: /status|inconsist|diverg|mismatch/,
    sequence: [/consult|fetch|request|requis|carreg/, /\bactive\b/, /\binactive\b/],
    expected: /\bactive\b/,
  },
};
const weights = [15, 15, 20, 15, 20, 10, 5];
const includesAmount = (text: string, amount: number) => new RegExp(`\\b${amount.toLocaleString('en-US').replaceAll(',', '[., ]?')}(?:[.,]00)?\\b`).test(text);

export function evaluateBugReport(scenario: InvestigationCase, draft: BugDraft, evidence?: Evidence) {
  const id = scenario.id;
  const rubric = rubrics[id];
  const { title, severity, priority, steps, expected, observed, module, environment } = Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [key, normalize(value)]),
  );
  const repeated = expected === observed;
  const rows = steps.split(/\r?\n/).filter(line => line.trim());
  let last = -1;
  const ordered = rubric.sequence.every(pattern => {
    last = rows.findIndex((line, index) => index > last && pattern.test(line));
    return last >= 0;
  });
  const checkout = evidence?.scenario === 'BUG-001' ? evidence.data : undefined;
  const expectedFact = id === 'BUG-001' ? includesAmount(expected, checkout?.expected ?? 450) && !includesAmount(expected, checkout?.observed ?? 475)
    : id === 'BUG-002' ? /email|e-mail/.test(expected) && !/\b(?:aceita|accepts)\b/.test(expected)
    : !/\binactive\b/.test(expected) && /api|interface|\bui\b/.test(expected);
  const observedFact = id === 'BUG-001' ? includesAmount(observed, checkout?.observed ?? 475) && /desconto|discount|total/.test(observed)
    : id === 'BUG-002' ? /aceit|accept|permit|allow/.test(observed) && /inval|usuario-sem-arroba/.test(observed) && !/rejeit|reject|\bnao aceit|not accept/.test(observed)
    : /\binactive\b/.test(observed) && /\bactive\b/.test(observed) && /interface|\bui\b/.test(observed) && /api/.test(observed)
      && !/(?:interface|\bui\b)[^,.]*\bactive\b[^,.]*(?:api|$)/.test(observed);
  const pass = [
    title.length >= 16 && rubric.context.test(title) && rubric.symptom.test(title) && /incorret|falh|inconsist|mismatch|incorrect|fail|invalid|diverg|wrong|indevid/.test(title),
    (scenario.severity === 'low' ? ['low', 'medium'] : ['medium', 'high']).includes(severity) && ['normal', 'high'].includes(priority),
    ordered,
    !repeated && rubric.expected.test(expected) && expectedFact,
    !repeated && observedFact,
    module.includes(normalize(scenario.module)) && /web|browser|navegador|chrome|safari|firefox|edge/.test(environment),
    !!evidence && evidence.scenario === id && Number.isFinite(Date.parse(evidence.at)) && (
      evidence.scenario === 'BUG-001' ? evidence.data.coupon === 'TESTE10' && evidence.data.difference > 0
      : evidence.scenario === 'BUG-002' ? evidence.data.accepted && !!evidence.data.example
      : evidence.data.status === 200 && evidence.data.field === 'status' && evidence.data.api.status !== String(evidence.data.ui.status)
    ),
  ];
  const criteria = pass.map((met, index) => ({ met, max: weights[index], points: met ? weights[index] : 0 }));
  const score = criteria.reduce((total, item) => total + item.points, 0);
  return { criteria, score, level: score < 40 ? 0 : score < 60 ? 1 : score < 80 ? 2 : score < 90 ? 3 : 4 };
}
export type ReportEvaluation = ReturnType<typeof evaluateBugReport>;
