import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Headphones, ShoppingCart } from 'lucide-react';
import type { Locale } from '@/lib/content';
import type { InvestigationCopy } from '@/lib/test-lab/investigation';
import type { InvestigationActions } from '@/lib/test-lab/investigation-actions';
import { captureEvidence, checkoutResult, compareCustomer, customerEndpoint, demoCustomer, initialCheckout, initialRegistration, registrationResult, unitPrice, validCoupon, type Evidence, type ScenarioId } from '@/lib/test-lab/investigation-model';
import styles from './BugInvestigation.module.css';

type DemoProps = { copy: InvestigationCopy; actions: InvestigationActions; locale: Locale; record: (evidence: Evidence) => void };
export const money = (locale: Locale, value: number) => new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: 'BRL' }).format(value);

function DemoCheckout({ copy, actions, locale, record }: DemoProps) {
  const [state, setState] = useState(initialCheckout);
  const [attempted, setAttempted] = useState(false);
  const { quantity, coupon, applied } = state;
  const { subtotal, discount, observed, expected } = checkoutResult(quantity, applied);
  const labels = copy.store;

  function apply(event: FormEvent) {
    event.preventDefault();
    const applied = validCoupon(coupon);
    setState({ ...state, applied });
    setAttempted(true);
    if (applied) record(captureEvidence('BUG-001', checkoutResult(quantity, true)));
  }

  return <div className={styles.demo}>
    <h5><ShoppingCart size={19} aria-hidden="true" />Test Store</h5>
    <div className={styles.demoGrid}>
      <div className={styles.surface}>
        <h6>{labels.order}</h6>
        <p className={styles.product}><Headphones size={24} aria-hidden="true" /><strong>Headset Pro</strong><span>{money(locale, unitPrice)}</span></p>
        <label>{labels.quantity}<input type="number" min={1} max={9} value={quantity} onChange={event => {
          const quantity = Math.min(9, Math.max(1, Math.trunc(event.currentTarget.valueAsNumber) || 1));
          setState({ ...state, quantity });
          if (applied) record(captureEvidence('BUG-001', checkoutResult(quantity, true)));
        }} /></label>
        <form className={styles.coupon} onSubmit={apply}>
          <label>{labels.coupon}<input placeholder="TESTE10" value={coupon} onChange={event => setState({ ...state, coupon: event.currentTarget.value })} /></label>
          <button type="submit">{labels.apply}</button>
        </form>
        <p role="status">{attempted && (applied ? labels.applied : labels.unknown)}</p>
      </div>
      <div className={styles.surface}>
        <h6>{labels.summary}</h6>
        <dl className={styles.totals}>
          <div><dt>{labels.subtotal}</dt><dd>{money(locale, subtotal)}</dd></div>
          <div><dt>{labels.discount}{applied && ' (10%)'}</dt><dd>{money(locale, -discount || 0)}</dd></div>
          <div className={styles.total}><dt>{labels.total}</dt><dd>{money(locale, observed)}</dd></div>
          {applied && <div><dt>{copy.fields.expected}</dt><dd>{money(locale, expected)}</dd></div>}
        </dl>
        <button type="button" disabled>{labels.finish}</button>
      </div>
    </div>
    <div className={styles.actions}><button type="button" onClick={() => { setState(initialCheckout); setAttempted(false); }}>{actions.reset}</button></div>
  </div>;
}

function DemoRegistration({ copy, actions, record }: DemoProps) {
  const [data, setData] = useState(initialRegistration);
  const [result, setResult] = useState<ReturnType<typeof registrationResult>>();
  const labels = { ...copy.registration, confirmation: actions.confirmation };

  return <div className={styles.demo}>
    <h5>{labels.title}</h5>
    <p>{actions.fictitious}</p>
    <form className={styles.demoGrid} autoComplete="off" noValidate onSubmit={event => {
      event.preventDefault();
      const result = registrationResult(data);
      setResult(result);
      if (result.accepted) setData({ ...data, password: '', confirmation: '' });
      if (result.reproduced) record(captureEvidence('BUG-002', { example: data.email.trim() === 'usuario-sem-arroba' ? 'usuario-sem-arroba' : '…', accepted: true }));
    }}>
      <div className={styles.surface}>
        {(Object.keys(initialRegistration) as (keyof typeof initialRegistration)[]).map((key, index) => <label key={key}>
          {labels[key]}<input type={key === 'email' ? 'email' : index >= 2 ? 'password' : 'text'} value={data[key]}
            autoComplete={index >= 2 ? 'new-password' : 'off'} aria-invalid={result?.errors[key] || undefined}
            onChange={event => { setData({ ...data, [key]: event.currentTarget.value }); setResult(undefined); }} />
        </label>)}
        <button type="submit">{labels.submit}</button>
      </div>
      <div className={styles.surface} role="status">
        <h6>{labels.messages}</h6>
        {result?.accepted && <p>{actions.accepted}</p>}
        {result?.reproduced && <p className={styles.accent}>{copy.cases[1].description}</p>}
        {result && Object.values(result.errors).map((error, index) => error && <p key={index}>{actions.registrationErrors[index]}</p>)}
      </div>
    </form>
    <div className={styles.actions}><button type="button" onClick={() => { setData(initialRegistration); setResult(undefined); }}>{actions.reset}</button></div>
  </div>;
}

function DemoComparison({ copy, actions, record }: DemoProps) {
  const [result, setResult] = useState<ReturnType<typeof compareCustomer>>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);

  async function query() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(customerEndpoint, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(String(response.status));
      const api = await response.json() as typeof demoCustomer;
      if (api.name !== demoCustomer.name || api.status !== demoCustomer.status || api.plan !== demoCustomer.plan) throw new Error('Unexpected response');
      if (request.current !== controller) return;
      const comparison = compareCustomer(api, response.status);
      setResult(comparison);
      record(captureEvidence('BUG-003', comparison));
    } catch {
      if (request.current === controller) setError(true);
    } finally {
      if (request.current === controller) { request.current = null; setLoading(false); }
    }
  }

  return <div className={styles.demo}>
    <h5>{copy.comparison.title}</h5>
    <div className={styles.actions}>
      <button type="button" disabled={loading} onClick={() => void query()}>{loading ? actions.pendingRequest : result ? actions.refresh : actions.reproduce}</button>
      <button type="button" onClick={() => { request.current?.abort(); request.current = null; setLoading(false); setResult(undefined); setError(false); }}>{actions.reset}</button>
    </div>
    <p role="status">{error && actions.requestError}</p>
    {result && <><div className={styles.demoGrid}>
      <div className={styles.surface}><h6>{copy.comparison.ui}</h6><p>{result.ui.name} · {result.ui.plan}</p><p className={styles.accent}>status: {result.ui.status}</p></div>
      <div className={styles.surface}><h6>{copy.comparison.api} · HTTP {result.status}</h6><pre>{JSON.stringify(result.api, null, 2)}</pre></div>
    </div><p className={styles.accent}>{copy.comparison.mismatch}</p></>}
  </div>;
}

export function InvestigationDemo({ id, ...props }: DemoProps & { id: ScenarioId }) {
  if (id === 'BUG-001') return <DemoCheckout {...props} />;
  if (id === 'BUG-002') return <DemoRegistration {...props} />;
  return <DemoComparison {...props} />;
}
