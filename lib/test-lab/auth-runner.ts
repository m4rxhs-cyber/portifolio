export type AuthCheck = { step: string; field: 'http' | 'code' | 'authenticated' | 'session' | 'message'; expected: string | number | boolean; observed: string | number | boolean; pass: boolean };
export type AuthFailure = 'network' | 'timeout' | 'response' | 'server' | 'limited' | 'internal';
export type AuthRun = { scenario: number; timestamp: string; duration: number; checks: AuthCheck[]; error?: AuthFailure };
type Action = 'login' | 'session' | 'logout';
type Answer = { code: string; authenticated: boolean; token?: string; message?: string };

const codes = new Set(['SIGNED_IN', 'AUTHORIZED', 'SIGNED_OUT', 'INVALID_INPUT', 'INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'SESSION_REQUIRED', 'SESSION_INVALID', 'ORIGIN_DENIED']);
const valid = { email: 'demo@example.test', password: 'demo-password' };
export const authScenarioIds = ['TC-AUTH-001', 'TC-AUTH-002', 'TC-AUTH-003', 'TC-AUTH-004', 'TC-AUTH-005'] as const;

class RunError extends Error {
  constructor(readonly kind: AuthFailure) { super(kind); }
}

async function request(action: Action, transport: typeof fetch, timeoutMs: number, body?: unknown, token?: string) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await transport(`/api/test-lab/auth/${action}`, {
      method: action === 'session' ? 'GET' : 'POST',
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 429) throw new RunError('limited');
    if (response.status >= 500) throw new RunError('server');
    let answer: Answer;
    try { answer = await response.json(); } catch { throw new RunError('response'); }
    if (!answer || typeof answer.code !== 'string' || typeof answer.authenticated !== 'boolean' || (answer.token !== undefined && (typeof answer.token !== 'string' || !/^[a-f0-9]{64}$/.test(answer.token)))) throw new RunError('response');
    return { status: response.status, answer };
  } catch (error) {
    if (signal.aborted) throw new RunError('timeout');
    if (error instanceof RunError) throw error;
    throw new RunError('network');
  }
}

export async function runAuthScenario(scenario: number, transport: typeof fetch = fetch, timeoutMs = 5000): Promise<AuthRun> {
  const timestamp = new Date().toISOString();
  const started = performance.now();
  const checks: AuthCheck[] = [];
  let error: AuthFailure | undefined;
  let token: string | undefined;

  function check(step: string, field: AuthCheck['field'], expected: AuthCheck['expected'], observed: AuthCheck['observed']) {
    checks.push({ step, field, expected, observed, pass: expected === observed });
  }

  async function expect(step: string, action: Action, status: number, code: string, authenticated: boolean, body?: unknown) {
    const response = await request(action, transport, timeoutMs, body, token);
    if (action === 'login' && response.answer.token) token = response.answer.token;
    check(step, 'http', status, response.status);
    check(step, 'code', code, codes.has(response.answer.code) ? response.answer.code : 'UNEXPECTED_CODE');
    check(step, 'authenticated', authenticated, response.answer.authenticated);
    if (action === 'login') check(step, 'session', authenticated, Boolean(response.answer.token));
    if (code === 'INVALID_INPUT') check(step, 'message', true, response.answer.message === 'Provide a valid demo email (up to 120 characters) and a password of 1–80 characters.');
  }

  try {
    if (scenario === 0 || scenario === 4) {
      await expect('anonymous', 'session', 401, 'SESSION_REQUIRED', false);
      await expect('login', 'login', 200, 'SIGNED_IN', true, valid);
      await expect('protected', 'session', 200, 'AUTHORIZED', true);
      if (scenario === 4) {
        await expect('logout', 'logout', 200, 'SIGNED_OUT', false);
        await expect('revoked', 'session', 401, 'SESSION_INVALID', false);
        if (checks.filter(item => item.step === 'revoked').every(item => item.pass)) token = undefined;
      }
    } else if (scenario === 1 || scenario === 2) {
      const blocked = scenario === 1;
      await expect('login', 'login', blocked ? 403 : 401, blocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS', false,
        blocked ? { ...valid, email: 'locked@example.test' } : { ...valid, password: 'wrong-demo-password' });
      if (!token) await expect('anonymous', 'session', 401, 'SESSION_REQUIRED', false);
    } else if (scenario === 3) {
      const inputs = { emptyEmail: { ...valid, email: '' }, emptyPassword: { ...valid, password: '' }, emptyBoth: { email: '', password: '' }, wrongTypes: { email: 1, password: null }, invalidEmail: { ...valid, email: 'invalid' }, longPassword: { ...valid, password: 'a'.repeat(81) } };
      for (const [step, input] of Object.entries(inputs)) {
        await expect(step, 'login', 400, 'INVALID_INPUT', false, input);
        if (token) break;
      }
    } else {
      throw new RunError('internal');
    }
  } catch (failure) {
    error = failure instanceof RunError ? failure.kind : 'internal';
  } finally {
    if (token) {
      try { await expect('cleanup', 'logout', 200, 'SIGNED_OUT', false); }
      catch (failure) { error ??= failure instanceof RunError ? failure.kind : 'internal'; }
    }
  }
  return { scenario, timestamp, duration: performance.now() - started, checks, error };
}
