import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { History, Layers, Plus, Send } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { assertReply, createRestClient, customerExample, endpointPath, endpoints, hasPathId, operators, requestPath, restPrefix, RestError, supportsBody, validPathId, type Assertion, type Check, type Endpoint, type Method, type Reply } from '@/lib/test-lab/rest-client';
import type { ScenarioRequest } from '@/lib/test-lab/rest-scenarios';
import type { RestCopy } from '@/lib/test-lab/rest-copy';
import { RestResponseViewer } from './RestReport';
import { RestTabs } from './RestTabs';
import layout from './RestWorkspace.module.css';

const demoHeaders = ['Accept', 'Content-Type', 'X-Demo-Request-ID'] as const;
const queryFields = ['page', 'limit', 'status'] as const;
type Outcome = { title: string; reply: Reply; checks: Check[]; timestamp: string };
const freshAssertion = (id: number) => ({ id, kind: 'status' as Assertion['kind'], field: '', expected: '200' });
export type ScenarioImport = ScenarioRequest & { label: string };
export type RestBuilderHandle = { isDirty: () => boolean; isBusy: () => boolean; load: (request: ScenarioImport) => void };
const defaultSource = JSON.stringify(customerExample, null, 2);
const defaultHeaders = { Accept: 'application/json' };
type Draft = { endpoint: Endpoint; method: Method; id: string; headers: Record<string, string>; params: Record<string, string>; source: string; assertions: Assertion[] };
const defaultDraft: Draft = { endpoint: 'customers', method: 'GET', id: '1', headers: defaultHeaders, params: {}, source: defaultSource, assertions: [freshAssertion(0)] };
const snapshot = (draft: Draft) => JSON.stringify({ ...draft, assertions: draft.assertions.map(({ kind, field, expected }) => ({ kind, field, expected })) });

export function RestBuilder({ copy, locale, ref }: { copy: RestCopy; locale: Locale; ref: Ref<RestBuilderHandle> }) {
  const [endpoint, setEndpoint] = useState(defaultDraft.endpoint);
  const [method, setMethod] = useState(defaultDraft.method);
  const [id, setId] = useState(defaultDraft.id);
  const [headers, setHeaders] = useState(() => ({ ...defaultDraft.headers }));
  const [params, setParams] = useState(() => ({ ...defaultDraft.params }));
  const [source, setSource] = useState(defaultDraft.source);
  const [assertions, setAssertions] = useState(() => defaultDraft.assertions.map((assertion, id) => ({ ...assertion, id })));
  const [history, setHistory] = useState<Outcome[]>([]);
  const [outcome, setOutcome] = useState<Outcome>();
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState(0);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetError, setResetError] = useState('');
  const [imported, setImported] = useState<ScenarioImport>();
  const [replacement, setReplacement] = useState<{ apply: () => void; newRequest?: boolean } | null>(null);
  const [pathError, setPathError] = useState(false);
  const original = useRef(snapshot(defaultDraft));
  const originalSource = useRef(defaultSource);
  const nextId = useRef(defaultDraft.assertions.length);
  const workspace = useRef<string | undefined>(undefined);
  const busy = useRef(false);
  const methods = endpoints[endpoint] as readonly Method[];
  const needsId = hasPathId(endpoint);
  const list = method === 'GET' && !needsId;
  const query = endpoint === 'customers' ? queryFields : queryFields.slice(0, 2);
  const search = list ? new URLSearchParams(query.flatMap(name => params[name] ? [[name, params[name]]] : [])).toString() : undefined;
  const previewPath = restPrefix + requestPath(endpoint, id, search);
  const isDirty = () => snapshot({ endpoint, method, id, headers, params, source, assertions }) !== original.current;

  function applyDraft(draft: Draft, scenario?: ScenarioImport) {
    original.current = snapshot(draft);
    originalSource.current = draft.source;
    setEndpoint(draft.endpoint); setMethod(draft.method); setId(draft.id);
    setHeaders({ ...draft.headers }); setParams({ ...draft.params }); setSource(draft.source);
    setAssertions(draft.assertions.map(assertion => ({ ...assertion, id: nextId.current++ })));
    setImported(scenario); setPathError(false); setMessage(''); setOutcome(undefined);
    setTab(supportsBody(draft.method) ? 2 : 0);
  }

  function load(request: ScenarioImport) {
    const operation = request.operation;
    const nextHeaders = { ...defaultHeaders, ...operation.headers };
    const nextParams = Object.fromEntries(new URLSearchParams(operation.query));
    const nextSource = operation.body === undefined ? '' : JSON.stringify(operation.body, null, 2);
    applyDraft({ endpoint: operation.endpoint, method: operation.method, id: operation.id ?? '',
      headers: nextHeaders, params: nextParams, source: nextSource, assertions: request.assertions }, request);
  }

  const newRequestButton = <button className={`${layout.secondary} ${layout.newRequest}`} type="button" disabled={running} onClick={event => {
    if (busy.current) return;
    if (isDirty()) {
      event.currentTarget.focus();
      setReplacement({ apply: () => applyDraft(defaultDraft), newRequest: true });
    } else applyDraft(defaultDraft);
  }}><Plus size={15} aria-hidden="true" />{copy.newRequest}</button>;

  useImperativeHandle(ref, () => ({ isDirty, isBusy: () => busy.current, load }));
  const example = (valid: boolean, selected = endpoint) => JSON.stringify(selected === 'orders'
    ? { customerId: 1, quantity: valid ? 2 : 0 }
    : { ...customerExample, email: valid ? customerExample.email : 'invalid-email' }, null, 2);

  async function send() {
    if (busy.current) return;
    setMessage(''); setOutcome(undefined);
    if (needsId && !validPathId(id)) { setPathError(true); return; }
    let body: unknown;
    if (supportsBody(method)) {
      try { body = JSON.parse(source); }
      catch { setTab(2); setMessage(copy.badJson); return; }
    }
    if (assertions.some(item => {
      if (item.kind === 'status') return !/^[1-5]\d{2}$/.test(item.expected);
      if (item.kind === 'duration') return !/^\d{1,6}$/.test(item.expected) || Number(item.expected) < 1;
      if (item.kind === 'header') return !/^[\w-]+$/.test(item.field) || !item.expected;
      if (!/^[\w-]+(?:\.[\w-]+)*$/.test(item.field)) return true;
      return item.kind === 'type' && !['null', 'array', 'object', 'string', 'number', 'boolean'].includes(item.expected);
    })) { setTab(3); setMessage(copy.badAssertion); return; }
    busy.current = true;
    setRunning(true);
    const client = createRestClient();
    try {
      workspace.current ??= await client.open();
      const reply = await client.request(workspace.current, { endpoint, method, id, query: search, body, headers: Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== '')) });
      if (reply.status === 410) workspace.current = undefined;
      const title = `${method} /${requestPath(endpoint, id, search)}`;
      const result = { title, reply, checks: assertions.map(assertion => assertReply(reply, assertion)), timestamp: new Date().toISOString() };
      setOutcome(result);
      setHistory(previous => [result, ...previous].slice(0, 8));
    } catch (failure) {
      setMessage(failure instanceof RestError ? `${copy.errors[failure.kind]}${failure.status ? ` HTTP ${failure.status}` : ''}` : copy.errors.server);
    } finally { busy.current = false; setRunning(false); }
  }

  async function reset() {
    if (busy.current) return;
    busy.current = true; setRunning(true); setMessage(''); setResetError('');
    try { if (workspace.current) await createRestClient().close(workspace.current); workspace.current = undefined; setHistory([]); setOutcome(undefined); setConfirmOpen(false); }
    catch { setResetError(copy.resetError); }
    finally { busy.current = false; setRunning(false); }
  }

  return <section className={`${layout.surface} ${layout.builder}`} aria-busy={running}>
    <header className={layout.builderHeading}>
      <div><h3>Request Builder</h3><p>{copy.builderIntro}</p></div>
      <div className={layout.secondaryActions}><span className={layout.restBadge}><Layers size={14} aria-hidden="true" />REST Lab</span>{!imported && newRequestButton}</div>
    </header>
    {imported && <div className={layout.imported}><span>{copy.loaded} · <strong>{imported.label}</strong></span><button className={layout.secondary} type="button" disabled={running} onClick={() => {
      if (isDirty()) setReplacement({ apply: () => load(imported) }); else load(imported);
    }}>{copy.restore}</button>{newRequestButton}</div>}
    <form noValidate onSubmit={event => { event.preventDefault(); void send(); }}>
      <div className={layout.requestBar}>
        <label className={layout.methodControl}><span className="sr-only">{copy.method}</span><select data-method={method} value={method} onChange={event => setMethod(event.target.value as Method)}>{methods.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className={layout.endpointControl}><span className="sr-only">{copy.endpoint}</span><select value={endpoint} onChange={event => {
          const selected = event.target.value as Endpoint;
          const change = () => {
            setEndpoint(selected); setMethod('GET'); setId(selected === 'order-by-id' ? '2' : '1');
            const nextSource = example(true, selected);
            setSource(nextSource); originalSource.current = nextSource; setPathError(false); setMessage('');
          };
          if (source !== originalSource.current) setReplacement({ apply: change }); else change();
        }}>{(Object.keys(endpoints) as Endpoint[]).map(value => <option key={value} value={value}>/api/test-lab/rest/{endpointPath(value)}</option>)}</select></label>
        <button className={layout.send} type="submit" disabled={running}><Send size={16} aria-hidden="true" />{running ? copy.running : copy.send}</button>
      </div>
      {needsId && <div className={layout.pathField}>
        <label className={layout.resourceId}>{copy.id}<input value={id} inputMode="numeric" maxLength={9} required aria-invalid={pathError || undefined} aria-describedby="rest-path-hint" onChange={event => {
          const value = event.target.value;
          if (imported?.needsCreatedId) setAssertions(previous => previous.map(assertion => assertion.kind === 'equals' && assertion.field === 'data.id' && assertion.expected === id ? { ...assertion, expected: value } : assertion));
          setId(value); setPathError(false);
        }} /></label>
        <p id="rest-path-hint" role={pathError ? 'alert' : undefined} className={pathError ? layout.error : layout.guidance}>{pathError ? copy.pathRequired : imported?.needsCreatedId ? copy.createdIdHint : copy.pathHint}</p>
      </div>}
      <div className={layout.requestPreview}><span>{copy.preview}</span><code><strong>{method}</strong> {previewPath}</code></div>
      <div className={layout.builderGrid}>
        <div className={layout.editorPane}>
          <RestTabs id="rest-request" label="Request Builder" tabs={copy.requestTabs} active={tab} onChange={setTab} />
          <div role="tabpanel" id="rest-request-panel-0" aria-labelledby="rest-request-tab-0" hidden={tab !== 0} className={layout.tabPanel}>
            {list ? <fieldset><legend>{copy.params}</legend>{query.map(name => <label className={layout.keyValue} key={name}><code>{name}</code><input maxLength={16} value={params[name] ?? ''} onChange={event => setParams({ ...params, [name]: event.target.value })} /></label>)}</fieldset> : <p className={layout.muted}>{copy.noParams}</p>}
          </div>
          <div role="tabpanel" id="rest-request-panel-1" aria-labelledby="rest-request-tab-1" hidden={tab !== 1} className={layout.tabPanel}>
            <fieldset><legend>{copy.headers}</legend>{demoHeaders.map(name => <label className={layout.keyValue} key={name}><code>{name}</code><input maxLength={120} value={headers[name] ?? ''} onChange={event => setHeaders({ ...headers, [name]: event.target.value })} /></label>)}</fieldset>
          </div>
          <div role="tabpanel" id="rest-request-panel-2" aria-labelledby="rest-request-tab-2" hidden={tab !== 2} className={layout.tabPanel}>
            {supportsBody(method) ? <>
              <div className={layout.panelHeading}>
                <label htmlFor="rest-json-body">{copy.body}</label>
                <div className={layout.secondaryActions}><button className={layout.secondary} type="button" onClick={() => setSource(example(true))}>{copy.valid}</button><button className={layout.secondary} type="button" onClick={() => setSource(example(false))}>{copy.invalid}</button><button className={layout.secondary} type="button" onClick={() => setSource('')}>{copy.clear}</button></div>
              </div>
              <textarea id="rest-json-body" className={layout.jsonInput} rows={7} maxLength={4096} spellCheck={false} wrap="off" aria-invalid={message === copy.badJson || undefined} aria-describedby={message === copy.badJson ? 'rest-builder-error' : undefined} value={source} onChange={event => {
                setSource(event.target.value); if (message === copy.badJson) setMessage('');
              }} />
              {message === copy.badJson && <p id="rest-builder-error" role="alert" className={layout.error}>{message}</p>}
            </> : <p className={layout.muted}>{copy.noBody}</p>}
          </div>
          <div role="tabpanel" id="rest-request-panel-3" aria-labelledby="rest-request-tab-3" hidden={tab !== 3} className={layout.tabPanel}>
      <fieldset><legend>{copy.assertions}</legend>
        {assertions.map(item => <div className={layout.assertion} key={item.id}>
          <label>{copy.operator}<select value={item.kind} onChange={event => setAssertions(assertions.map(current => current.id === item.id ? { ...current, kind: event.target.value as Assertion['kind'] } : current))}>{operators.map(kind => <option key={kind} value={kind}>{copy.operators[kind]}</option>)}</select></label>
          {item.kind !== 'status' && item.kind !== 'duration' && <label>{copy.field}<input maxLength={100} value={item.field} onChange={event => setAssertions(assertions.map(current => current.id === item.id ? { ...current, field: event.target.value } : current))} /></label>}
          {item.kind !== 'exists' && <label>{copy.value}<input maxLength={160} value={item.expected} onChange={event => setAssertions(assertions.map(current => current.id === item.id ? { ...current, expected: event.target.value } : current))} /></label>}
          <button className={layout.secondary} type="button" onClick={() => setAssertions(assertions.filter(current => current.id !== item.id))}>{copy.remove}</button>
        </div>)}
        <button className={layout.secondary} type="button" disabled={assertions.length >= 10} onClick={() => setAssertions([...assertions, freshAssertion(nextId.current++)])}>{copy.add}</button>
      </fieldset>
          </div>
        </div>
        <section className={layout.responsePane} aria-label={copy.response}>
          {outcome ? <RestResponseViewer key={outcome.timestamp} reply={outcome.reply} checks={outcome.checks} title={outcome.title} copy={copy} /> : <>
            <h4>{copy.response}</h4>
            {message && message !== copy.badJson ? <p role="alert" className={layout.error}>{message}</p> : <p role="status" className={layout.muted}>{running ? copy.running : copy.emptyResponse}</p>}
          </>}
        </section>
      </div>
    </form>
    <details className={layout.history}>
      <summary><History size={16} aria-hidden="true" />{copy.history} ({history.length})</summary>
      <ul role="list">{history.map((item, index) => <li key={index}><button type="button" disabled={running} onClick={() => { setMessage(''); setOutcome(item); }}><span>{item.title}</span><span>HTTP {item.reply.status} · {Math.round(item.reply.duration)} ms · <time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleTimeString(locale === 'pt' ? 'pt-BR' : 'en-US')}</time></span></button></li>)}</ul>
      <button className={layout.secondary} type="button" aria-disabled={running || (!workspace.current && !history.length)} onClick={event => {
        if (busy.current || (!workspace.current && !history.length)) return;
        event.currentTarget.focus();
        setResetError(''); setConfirmOpen(true);
      }}>{copy.reset}</button>
    </details>
    <ConfirmDialog open={confirmOpen} title={copy.resetTitle} description={copy.resetConfirm} confirmLabel={copy.confirmReset}
      cancelLabel={copy.cancel} variant="destructive" loading={confirmOpen && running} loadingLabel={copy.resetting} error={resetError}
      onConfirm={() => void reset()} onCancel={() => { if (!busy.current) setConfirmOpen(false); }} />
    <ConfirmDialog open={replacement !== null} title={replacement?.newRequest ? copy.newRequestTitle : copy.unsaved}
      description={replacement?.newRequest ? copy.newRequestHint : copy.discardHint} confirmLabel={replacement?.newRequest ? copy.newRequestConfirm : copy.discard}
      cancelLabel={copy.cancel} variant="destructive" onCancel={() => setReplacement(null)} onConfirm={() => { replacement?.apply(); setReplacement(null); }} />
    <p className={layout.guidance}>{copy.guidance}</p>
  </section>;
}
