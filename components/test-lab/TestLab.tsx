'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowDown, Bug, CodeXml, ExternalLink, Eye, EyeOff, FlaskConical, LockKeyhole, Play, Terminal } from 'lucide-react';
import type { Locale } from '@/lib/content';
import { apiCases, createRun, type ApiCase, type Result, type Status } from '@/lib/test-lab/model';
import { authCases, bugCases, demoPassword, demoUser, reproduceBug, runAuthentication, signIn, signOut } from '@/lib/test-lab/local';
import { apiPlans, bugInputs, bugReports, label, labels } from '@/lib/test-lab/i18n';
import { ApiTestInspector, DisplayValue } from './ApiTestInspector';
import { LabSelect } from './LabSelect';

const modules = ['auth', 'api', 'bug'] as const;
const moduleIcons = { auth: LockKeyhole, api: CodeXml, bug: Bug };
const historyKey = 'engineering-dark.test-lab.history.v1';
const moduleKey = 'engineering-dark.test-lab.module';
type Module = typeof modules[number];
type Selection = { module: Module; index: number; example: boolean };
type HistoryItem = { result: Result; selection: Selection; manual?: boolean };
const scenarioId = (module: Module, index: number) => module === 'api'
  ? 'TC-API-' + String(index + 1).padStart(3, '0') : (module === 'auth' ? authCases : bugCases)[index][0];

function moduleInHash(): Module {
  const hash = window.location.hash.slice(1);
  return modules.find((module) => module === hash) ?? 'auth';
}

export function TestLab({ locale, embedded = false }: { locale: Locale; embedded?: boolean }) {
  const t = labels[locale];
  const languageIndex = locale === 'pt' ? 1 : 2;
  const [module, setModule] = useState<Module>('auth');
  const [index, setIndex] = useState(0);
  const [example, setExample] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Partial<Record<Module, string>>>({});
  const [runningModule, setRunningModule] = useState<Module>();
  const [session, setSession] = useState(false);
  const [message, setMessage] = useState<string>();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordId = useId();

  useEffect(() => {
    const update = () => { setModule(moduleInHash()); setIndex(0); };
    if (!embedded) update();
    try {
      if (embedded) {
        const savedModule = modules.find((id) => id === sessionStorage.getItem(moduleKey));
        if (savedModule) setModule(savedModule);
      }
      const stored: unknown = JSON.parse(sessionStorage.getItem(historyKey) ?? '[]');
      if (Array.isArray(stored)) setHistory(stored.slice(0, 20) as HistoryItem[]);
    } catch {
      // The session still works if browser storage is unavailable.
    }
    if (!embedded) {
      window.addEventListener('hashchange', update);
      return () => window.removeEventListener('hashchange', update);
    }
  }, [embedded]);

  const cases = module === 'auth' ? authCases : module === 'api' ? apiCases : bugCases;
  const currentIndex = Math.min(index, cases.length - 1);
  const moduleHistory = history.filter((item) => item.selection.module === module);
  const selected = moduleHistory.find((item) => item.result.id === selectedIds[module]) ?? moduleHistory[0];
  const result = selected?.result;
  const running = runningModule !== undefined;
  const runningHere = runningModule === module;
  const status: Status = runningHere ? 'RUNNING' : result?.status ?? 'IDLE';
  const alternate = locale === 'pt' ? 'en' : 'pt';
  const Container = embedded ? 'div' : 'main';
  const Title = embedded ? 'h2' : 'h1';

  function selectModule(id: Module) {
    if (id === module) return;
    setModule(id);
    setIndex(0);
    try { sessionStorage.setItem(moduleKey, id); } catch { /* Storage is optional. */ }
  }

  function saveHistory(items: HistoryItem[]) {
    setHistory(items);
    try {
      if (items.length) sessionStorage.setItem(historyKey, JSON.stringify(items));
      else sessionStorage.removeItem(historyKey);
    } catch {
      // Keep the in-memory history if the storage quota is unavailable.
    }
  }

  function record(item: HistoryItem) {
    setSelectedIds((previous) => ({ ...previous, [item.selection.module]: item.result.id }));
    saveHistory([item, ...history].slice(0, 20));
  }

  async function execute(selection: Selection) {
    if (running) return;
    const { module, index, example } = selection;
    setRunningModule(module);
    let result: Result;
    try {
      if (module === 'auth') {
        result = runAuthentication(index);
      } else if (module === 'bug') {
        result = reproduceBug(index, example);
      } else {
        const response = await fetch('/api/test-lab', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: apiCases[index][0] satisfies ApiCase }),
          signal: AbortSignal.timeout(58_000),
        });
        if (response.ok) {
          result = await response.json() as Result;
        } else {
          const body = await response.json() as { error?: string };
          result = createRun(apiCases[index][0]).finish(body.error ?? 'unexpected');
        }
      }
    } catch (cause) {
      result = createRun(scenarioId(module, index)).finish(
        cause instanceof DOMException && cause.name === 'TimeoutError' ? 'timeout' : 'connection',
      );
    } finally {
      setRunningModule(undefined);
    }
    record({ selection, result });
  }

  function manualAuth(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (running) return;
    const index = !event ? 4
      : !user.trim() || !password ? 3
      : user !== demoUser ? 2
      : password !== demoPassword ? 1 : 0;
    const state = event ? signIn(user, password) : signOut();
    const run = createRun(authCases[index][0]);
    run.logs.push(event ? 'signIn' : 'signOut');
    run.check('session', index === 0, state.authenticated);
    run.check('message', ['signedIn', 'rejected', 'rejected', 'required', 'signedOut'][index], state.message);
    setSession(state.authenticated);
    if (state.authenticated) setPasswordVisible(false);
    setMessage(state.message);
    record({ selection: { module: 'auth', index, example: true }, result: run.finish(), manual: true });
  }

  const activeBug = selected?.selection.module === 'bug' ? selected.selection.index : undefined;

  return (
    <Container className={embedded ? 'lab-page lab-embedded' : 'shell lab-page'}>
      {!embedded && <header className="lab-header">
        <a href={'/' + locale + '#lab'}><ArrowLeft size={16} />{t.back}</a>
        <a href={'/' + alternate + '/test-lab#' + module} hrefLang={alternate} lang={alternate}>{alternate.toUpperCase()}</a>
      </header>}
      <div className="lab-intro"><FlaskConical aria-hidden="true" /><Title>Test Lab</Title><p>{t.intro}</p></div>
      <nav className="lab-tabs" aria-label={t.modules}>
        {modules.map((id) => {
          const Icon = moduleIcons[id];
          const caption = <><Icon size={18} aria-hidden="true" /><span>{t[id]}</span></>;
          return embedded
            ? <button key={id} type="button" aria-pressed={module === id} onClick={() => selectModule(id)}>{caption}</button>
            : <a key={id} href={'#' + id} aria-current={module === id ? 'location' : undefined}>{caption}</a>;
        })}
      </nav>
      <div className="lab-grid">
        <div className="lab-controls">
          {module === 'auth' && (
            <section className="lab-panel">
              <h2>{t.manual}</h2>
              <div className="lab-demo-credentials">
                <h3><LockKeyhole size={16} aria-hidden="true" />{t.demo}</h3>
                <dl>
                  <div><dt>{t.user}</dt><dd><code>{demoUser}</code></dd></div>
                  <div><dt>{t.password}</dt><dd><code>{demoPassword}</code></dd></div>
                </dl>
                {!session && <button type="button" className="lab-demo-fill" disabled={running} onClick={() => {
                  setUser(demoUser);
                  setPassword(demoPassword);
                  setMessage(undefined);
                }}><ArrowDown size={15} aria-hidden="true" />{t.fillDemo}</button>}
              </div>
              <p role="status"><strong>{session ? t.connected : t.disconnected}</strong>{message && ' · ' + label(locale, message)}</p>
              {session ? <button className="button button-outline" disabled={running} onClick={() => manualAuth()}>{t.signOut}</button> : (
                <form onSubmit={manualAuth} className="lab-form">
                  <label>{t.user}<input name="demo-user" value={user} onChange={(event) => setUser(event.target.value)} autoComplete="off" maxLength={80} /></label>
                  <div className="lab-password-field">
                    <label htmlFor={passwordId}>{t.password}</label>
                    <div className="lab-password-control">
                      <input id={passwordId} name="demo-password" type={passwordVisible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" maxLength={80} />
                      <button type="button" aria-controls={passwordId} aria-label={passwordVisible ? t.hidePassword : t.showPassword}
                        onClick={() => setPasswordVisible((visible) => !visible)}>
                        {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="button button-outline" disabled={running}>{t.signIn}</button>
                </form>
              )}
            </section>
          )}
          <section className="lab-panel">
            <h2>{module === 'auth' ? t.automated : t.configuration}</h2>
            <div className="lab-form">
              {module !== 'auth' ? (
                <LabSelect name={t.scenario} items={cases.map((item, i) => ({ code: scenarioId(module, i), title: item[languageIndex] }))}
                  value={currentIndex} disabled={running} onChange={setIndex} />
              ) : <label>{t.scenario}<select value={currentIndex} onChange={(event) => setIndex(Number(event.target.value))} disabled={running}>
                {cases.map((item, i) => <option value={i} key={item[0]}>{scenarioId(module, i)} · {item[languageIndex]}</option>)}
              </select></label>}
              {module === 'api' && <p>{apiPlans[locale][currentIndex]}</p>}
              {module === 'bug' && <LabSelect name={t.example}
                items={[{ title: bugInputs[currentIndex][0] }, { title: bugInputs[currentIndex][1] + ' (' + t.control + ')' }]}
                value={example ? 0 : 1} disabled={running} onChange={(input) => setExample(input === 0)} />}
              <button className="button button-primary" disabled={running} onClick={() => void execute({ module, index: currentIndex, example })}>
                <Play size={15} />{runningHere ? t.running : module === 'bug' ? t.repro : t.run}
              </button>
            </div>
          </section>
          <section className="lab-panel lab-notes">
            <h2>{t.notes}</h2><p>{t[module === 'api' ? 'apiNote' : module === 'auth' ? 'authNote' : 'bugNote']}</p>
            {module === 'api' && <a href="https://restful-booker.herokuapp.com/apidoc/index.html" target="_blank" rel="noopener noreferrer">{t.docs}<ExternalLink size={14} /></a>}
          </section>
        </div>
        <div className="lab-controls">
          <section className="lab-panel" aria-busy={runningHere}>
            <div className="lab-panel-heading"><h2><Terminal size={17} />{t.results}</h2><span className={'lab-status status-' + status} role="status">{t[status]}</span></div>
            {!result && <p>{t.empty}</p>}
            {result && selected && <>
              <p><strong>{scenarioId(selected.selection.module, selected.selection.index)}</strong> · {result.duration} ms · {result.assertions.filter((item) => item.pass).length} {t.passed.toLowerCase()} / {result.assertions.filter((item) => !item.pass).length} {t.failed.toLowerCase()}</p>
              {result.error && <p className="lab-error">{label(locale, result.error)}</p>}
              {!!result.assertions.length && <><h3>{t.assertions}</h3><ul className="lab-assertions">{result.assertions.map((assertion) => (
                <li key={assertion.id}>
                  <strong>{assertion.id} · {label(locale, assertion.label)}</strong>
                  <span className={assertion.pass ? 'lab-pass' : 'lab-fail'}>{assertion.pass ? 'PASS' : 'FAIL'}</span>
                  <span>{t.expected} <DisplayValue value={assertion.expected} /></span>
                  <span>{t.actual} <DisplayValue value={assertion.actual} /></span>
                </li>
              ))}</ul></>}
              {!!result.logs.length && <><h3>{t.logs}</h3><ul className="lab-logs">{result.logs.map((entry, i) => <li key={i}>{label(locale, entry)}</li>)}</ul></>}
              <ApiTestInspector result={result} locale={locale} />
              {activeBug !== undefined && result.assertions[0] && <div className="lab-report">
                <h3>{t.report} · {bugCases[activeBug][0]}</h3>
                <p><strong>{bugCases[activeBug][languageIndex]}</strong></p>
                <p><strong>{t.preconditions}</strong> {bugReports[locale][activeBug][0]}</p>
                <p><strong>{t.steps}</strong> {bugReports[locale][activeBug][1]}</p>
                <p><strong>{t.expected}</strong> <DisplayValue value={result.assertions[0].expected} /></p>
                <p><strong>{t.actual}</strong> <DisplayValue value={result.assertions[0].actual} /></p>
                <p><strong>{t.severity}</strong> {bugReports[locale][activeBug][2]}</p>
                <p><strong>{t.evidence}</strong> <code>{bugInputs[activeBug][selected.selection.example ? 0 : 1]}</code> · {result.status === 'FAILED' ? t.reproduced : t.noRepro}</p>
              </div>}
              {!selected.manual && <button className="button button-outline lab-rerun" disabled={running} onClick={() => void execute(selected.selection)}>{t.rerun}</button>}
            </>}
          </section>
          <section className="lab-panel">
            <div className="lab-panel-heading"><h2>{t.history}</h2><button type="button" disabled={running || !moduleHistory.length} onClick={() => saveHistory(history.filter((item) => item.selection.module !== module))}>{t.clear}</button></div>
            {!moduleHistory.length ? <p>{t.empty}</p> : <ol className="lab-history">{moduleHistory.map((item) => (
              <li key={item.result.id}><button aria-pressed={item === selected} disabled={running} onClick={() => setSelectedIds((previous) => ({ ...previous, [module]: item.result.id }))}>
                <strong>{scenarioId(item.selection.module, item.selection.index)}</strong>
                <time dateTime={item.result.timestamp}>{new Date(item.result.timestamp).toLocaleTimeString(locale)}</time>
                <span className={'lab-status status-' + item.result.status}>{t[item.result.status]}</span>
              </button></li>
            ))}</ol>}
          </section>
        </div>
      </div>
    </Container>
  );
}
