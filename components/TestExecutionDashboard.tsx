import { Check, CircleCheck, CircleX, Clock, Play, Zap } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { home } from '@/lib/home';

const demo = { passed: 46, failed: 2, skipped: 0, duration: '03m 42s', history: [true, true, true, true, false, true] };

export function TestExecutionDashboard({ locale }: { locale: Locale }) {
  const [title, status, simulation, rateLabel, passed, failed, skipped, duration, history] = home[locale].dashboard;
  const rate = new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en', {
    style: 'percent', maximumFractionDigits: 1,
  }).format(demo.passed / (demo.passed + demo.failed));

  const stats = [
    { label: passed, value: demo.passed, Icon: CircleCheck, color: '#35d571' },
    { label: failed, value: demo.failed, Icon: CircleX, color: '#ff3545' },
    { label: skipped, value: demo.skipped, Icon: Play, color: '#efcf7c' },
    { label: duration, value: demo.duration, Icon: Clock, color: '#efcf7c' },
  ];

  return (
    <div className="test-dashboard" role="group" aria-label={title}>
      <div className="dashboard-chrome" aria-hidden="true"><i /><i /><i /></div>
      <div className="dashboard-heading">
        <strong><Zap />{title}</strong>
        <span className="simulation">{simulation}</span>
        <span className="run-status"><Check />{status}</span>
      </div>
      <div className="dashboard-body">
        <div className="pass-gauge">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d="M 23,81 A 41,41 0 1,1 77,81" pathLength="100" className="gauge-track" />
            <path d="M 23,81 A 41,41 0 1,1 77,81" pathLength="100" className="gauge-value"
              strokeDasharray={demo.passed / (demo.passed + demo.failed) * 100 + ' 100'} />
          </svg>
          <div><b>{rate}</b><small>{rateLabel}</small></div>
        </div>
        <dl className="run-stats">
          {stats.map(({ label, value, Icon, color }) => (
            <div key={label}><dt><Icon color={color} />{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>
      <div className="run-history">
        <strong>{history}</strong>
        <ol>{demo.history.map((success, index) => {
          const day = 14 + index;
          return <li key={day} className={success ? 'success' : 'failed'} aria-label={day + ' Nov: ' + (success ? passed : failed)}>
            <i aria-hidden="true" />{locale === 'pt' ? day + '/11' : '11/' + day}
          </li>;
        })}</ol>
      </div>
    </div>
  );
}
