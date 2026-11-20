import { ChartNoAxesColumnIncreasing, ChevronsRight, ClipboardList, CodeXml, Layers, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/content';

const workflow = [
  { Icon: ClipboardList, pt: 'Planejamento', en: 'Planning' },
  { Icon: CodeXml, pt: 'Automação', en: 'Automation' },
  { Icon: Layers, pt: 'Execução CI/CD', en: 'CI/CD Execution' },
  { Icon: ChartNoAxesColumnIncreasing, pt: 'Análise de Resultados', en: 'Results Analysis' },
  { Icon: ShieldCheck, pt: 'Qualidade Contínua', en: 'Continuous Quality' },
] as const;

export function QAWorkflow({ locale }: { locale: Locale }) {
  return (
    <ol className="qa-workflow" aria-label={locale === 'pt' ? 'Fluxo de qualidade de software' : 'Software quality workflow'}>
      {workflow.map(({ Icon, ...label }, index) => (
        <li key={label.en}>
          <Icon size={23} aria-hidden="true" />
          <span>{label[locale]}</span>
          {index < workflow.length - 1 && <ChevronsRight className="qa-workflow-arrow" size={19} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
