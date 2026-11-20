import type { Locale } from '@/lib/content';
import { label, labels } from '@/lib/test-lab/i18n';
import type { Result } from '@/lib/test-lab/model';

export function DisplayValue({ value }: { value: unknown }) {
  return <code>{typeof value === 'string' ? value : JSON.stringify(value) ?? '—'}</code>;
}

function Json({ value }: { value: unknown }) {
  return <pre tabIndex={0}>{typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '—'}</pre>;
}

export function ApiTestInspector({ result, locale }: { result: Result; locale: Locale }) {
  const t = labels[locale];
  return result.exchanges.map((exchange, index) => (
    <details className="lab-exchange" key={index} open={index === 0}>
      <summary><code>{exchange.method} {exchange.path}</code><span>{exchange.status ?? '—'} · {exchange.duration} ms</span></summary>
      <div className="lab-inspector">
        <div><h4>{t.request}</h4><time dateTime={exchange.timestamp}>{exchange.timestamp}</time><Json value={exchange.requestHeaders} />
          {exchange.payload !== undefined && <Json value={exchange.payload} />}
        </div>
        <div><h4>{t.response}</h4>
          {exchange.error && <p role="status">{label(locale, exchange.error)}</p>}
          <Json value={exchange.responseHeaders} />
          {exchange.body && typeof exchange.body === 'object' && 'omitted' in exchange.body
            ? <p>{t.withheld}</p> : <Json value={exchange.body} />}
        </div>
      </div>
    </details>
  ));
}
