import type { Check, Reply } from '@/lib/test-lab/rest-client';
import type { RestCopy } from '@/lib/test-lab/rest-copy';
import styles from './LabPreview.module.css';
import layout from './RestWorkspace.module.css';
import { RestTabs } from './RestTabs';

const jsonToken = /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b)/g;

function HighlightedJson({ text }: { text: string }) {
  return <pre className={layout.json} tabIndex={0}><code>{text.split('\n').map((line, index) => (
    <span className={layout.jsonLine} key={index}><span className={layout.lineNumber} aria-hidden="true">{index + 1}</span><span>{line.split(jsonToken).map((part, piece) => piece % 2 === 0 ? part : <span key={piece} data-token={part.endsWith(':') ? 'key' : part.startsWith('"') ? 'string' : 'literal'}>{part}</span>)}</span>{'\n'}</span>
  ))}</code></pre>;
}

export function RestResponseViewer({ reply, checks, title, copy }: { reply: Reply; checks: Check[]; title: string; copy: RestCopy }) {
  const [tab, setTab] = useState(0);
  const [notice, setNotice] = useState('');
  const text = JSON.stringify(reply.body, null, 2);
  const count = copy.count(checks.filter(check => check.pass).length, checks.length);
  async function copyResponse() {
    try { await navigator.clipboard.writeText(text); setNotice(copy.copied); }
    catch { setNotice(copy.copyFailed); }
  }
  return <>
    <div className={layout.panelHeading}>
      <h4>{copy.response}</h4>
      <button className={layout.secondary} type="button" onClick={() => void copyResponse()}><Copy size={15} aria-hidden="true" />{copy.copyResponse}</button>
    </div>
    {notice && <p role="status" className={layout.muted}>{notice}</p>}
    <div className={layout.metadata}>
      <strong data-http={reply.status >= 400 ? 'error' : 'success'}>HTTP {reply.status}</strong>
      <span><Clock3 size={14} aria-hidden="true" />{Math.round(reply.duration)} ms</span>
      <span><Database size={14} aria-hidden="true" />{reply.bytes} B</span>
    </div>
    <RestTabs id="rest-response" label={copy.response} tabs={[copy.responseTabs[0], `${copy.responseTabs[1]} (${Object.keys(reply.headers).length})`, copy.responseTabs[2]]} active={tab} onChange={setTab} />
    <div role="tabpanel" id="rest-response-panel-0" aria-labelledby="rest-response-tab-0" hidden={tab !== 0}><HighlightedJson text={text} /></div>
    <div role="tabpanel" id="rest-response-panel-1" aria-labelledby="rest-response-tab-1" hidden={tab !== 1}>
      <dl className={layout.headers}>{Object.entries(reply.headers).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    <div role="tabpanel" id="rest-response-panel-2" aria-labelledby="rest-response-tab-2" hidden={tab !== 2} className={layout.summary}><p>{title}</p><p>{count}</p></div>
    <details className={layout.verifications} open>
      <summary>{count}</summary>
      <RestChecks checks={checks} copy={copy} showCount={false} />
    </details>
  </>;
}

export function RestChecks({ checks, copy, showCount = true }: { checks: Check[]; copy: RestCopy; showCount?: boolean }) {
  const format = (value: unknown) => JSON.stringify(value) ?? '—';
  return <>
    {showCount && <p>{copy.count(checks.filter(check => check.pass).length, checks.length)}</p>}
    <ul role="list">{checks.map((check, index) => <li className={styles.authStep} key={index}>
      <strong>{copy.operators[check.kind]} {check.field}</strong> · <span className={styles.authStatus} data-status={check.pass ? 'passed' : 'failed'}>{check.pass ? copy.passed : copy.failed}</span>
      <p>{copy.expected}: {format(check.expected)} · {copy.observed}: {format(check.observed)}</p>
    </li>)}</ul>
  </>;
}

export function RestResponse({ reply, copy }: { reply: Reply; copy: RestCopy }) {
  return <>
    <p><strong>HTTP {reply.status}</strong> · {Math.round(reply.duration)} ms · {reply.bytes} B</p>
    <details><summary>Headers</summary><pre className={styles.code}>{JSON.stringify(reply.headers, null, 2)}</pre></details>
    <h4>{copy.body}</h4>
    <pre className={styles.code}><code>{JSON.stringify(reply.body, null, 2)}</code></pre>
  </>;
}
import { useState } from 'react';
import { Clock3, Copy, Database } from 'lucide-react';
