import { z } from 'zod';
import { booking, bookingIdentifier, bookingList, createdBooking, type Booking } from './contracts';
import { createRun, type ApiCase, type Exchange } from './model';

const origin = 'https://restful-booker.herokuapp.com';
const maxBody = 128 * 1024;
const headers = { Accept: 'application/json' };
const tokenSchema = z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]+$/) });
const publicMessages = new Set(['Created', 'OK', 'Not Found', 'Forbidden', 'Bad Request', 'Unauthorized', 'Internal Server Error']);

class RunError extends Error {}

async function readBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) throw new RunError('bodyLimit');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (!response.headers.get('content-type')?.includes('json')) return text;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

export async function runBooker(scenario: ApiCase, upstream: typeof fetch = fetch) {
  const run = createRun(scenario);
  const marker = 'EngineeringDark-' + crypto.randomUUID();
  const identity = z.object({ lastname: z.literal(marker), additionalneeds: z.literal(marker) });
  const sample: Booking = {
    firstname: 'QA', lastname: marker, totalprice: 350, depositpaid: true,
    bookingdates: { checkin: '2026-12-10', checkout: '2026-12-15' }, additionalneeds: marker,
  };
  let owned: number | undefined;
  let token: string | undefined;
  let error: string | undefined;

  function inspectBody(path: string, body: unknown) {
    if (typeof body === 'string' && publicMessages.has(body)) return body;
    if (path === '/booking' && scenario === 'list') {
      const list = bookingList.safeParse(body);
      if (list.success) return list.data;
    }
    const created = createdBooking.safeParse(body);
    if (created.success && identity.safeParse(created.data.booking).success) return created.data;
    const observed = booking.safeParse(body);
    if (observed.success && identity.safeParse(observed.data).success) return observed.data;
    const id = bookingIdentifier.safeParse(body);
    if (id.success) return id.data;
    if (body === '' || body === null) return body;
    return { omitted: true };
  }

  async function request(method: string, path: string, payload?: unknown, auth?: string) {
    const sensitive = path === '/auth';
    const requestHeaders = payload === undefined ? headers : { ...headers, 'Content-Type': 'application/json' };
    const entry: Exchange = {
      method, path, timestamp: new Date().toISOString(), duration: 0,
      requestHeaders, responseHeaders: {}, payload: sensitive ? undefined : payload,
    };
    const tick = performance.now();
    run.exchanges.push(entry);
    const signal = AbortSignal.timeout(4000);
    try {
      const response = await upstream(origin + path, {
        method, cache: 'no-store', redirect: 'error', signal,
        headers: auth ? { ...requestHeaders, Cookie: 'token=' + auth } : requestHeaders,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      entry.status = response.status;
      const type = response.headers.get('content-type');
      if (type) entry.responseHeaders['content-type'] = type;
      const body = await readBody(response);
      if (!sensitive) entry.body = inspectBody(path, body);
      const invalidInputResponse = scenario === 'invalid' && path === '/booking' && method === 'POST' && response.status === 500;
      if ((response.status >= 500 && !invalidInputResponse) || response.status === 429) throw new RunError('upstream');
      return { status: response.status, body };
    } catch (cause) {
      entry.error = cause instanceof RunError ? cause.message : signal.aborted ? 'timeout' : 'connection';
      throw new RunError(entry.error);
    } finally {
      entry.duration = Math.round(performance.now() - tick);
    }
  }

  function status(expected: number, actual: number) {
    return run.check('httpStatus', expected, actual);
  }

  function validate<T>(schema: z.ZodType<T>, data: unknown, name: string): T | undefined {
    const parsed = schema.safeParse(data);
    run.check('contract', name, parsed.success ? name : parsed.error.issues.map((issue) => issue.path.join('.') || issue.code), parsed.success);
    return parsed.success ? parsed.data : undefined;
  }

  function compare(expected: Booking, actual: Booking) {
    const start = run.assertions.length;
    for (const key of ['firstname', 'lastname', 'totalprice', 'depositpaid', 'additionalneeds'] as const) {
      run.check(key, expected[key], actual[key]);
    }
    run.check('checkin', expected.bookingdates.checkin, actual.bookingdates.checkin);
    run.check('checkout', expected.bookingdates.checkout, actual.bookingdates.checkout);
    return run.assertions.slice(start).every((assertion) => assertion.pass);
  }

  async function authenticate() {
    const username = process.env.BOOKER_USERNAME;
    const password = process.env.BOOKER_PASSWORD;
    if (!username || !password) throw new RunError('credentials');
    const response = await request('POST', '/auth', { username, password });
    const parsed = tokenSchema.safeParse(response.body);
    if (response.status !== 200 || !parsed.success) throw new RunError('authError');
    token = parsed.data.token;
    run.logs.push('authorized');
  }

  async function create() {
    const response = await request('POST', '/booking', sample);
    const validStatus = status(200, response.status);
    const parsed = validate(createdBooking, response.body, 'BookingCreationResponse');
    const id = bookingIdentifier.safeParse(response.body);
    if (id.success && response.status >= 200 && response.status < 300) owned = id.data.bookingid;
    if (!validStatus || !parsed || !run.check('ownership', true, identity.safeParse(parsed.booking).success)) return false;
    return compare(sample, parsed.booking);
  }

  async function readOwned(expected: Booking) {
    if (owned === undefined) return false;
    const response = await request('GET', '/booking/' + owned);
    const validStatus = status(200, response.status);
    if (!validStatus) return false;
    if (!run.check('ownership', true, identity.safeParse(response.body).success)) throw new RunError('ownership');
    const observed = validate(booking, response.body, 'Booking');
    if (!observed) return false;
    return compare(expected, observed);
  }

  async function removeOwned(verify: boolean) {
    if (owned === undefined || !token) return;
    const path = '/booking/' + owned;
    const current = await request('GET', path);
    if (current.status === 404) {
      owned = undefined;
      if (verify) status(200, current.status);
      return;
    }
    if (current.status !== 200 || !identity.safeParse(current.body).success) throw new RunError('ownership');
    const response = await request('DELETE', path, undefined, token);
    if (response.status === 403 || response.status === 401) throw new RunError('authError');
    const removed = status(201, response.status);
    if (removed) owned = undefined;
    const after = await request('GET', path);
    if (after.status === 404) owned = undefined;
    status(404, after.status);
  }

  try {
    if (scenario === 'ping') {
      const response = await request('GET', '/ping');
      status(201, response.status);
    } else if (scenario === 'list') {
      const response = await request('GET', '/booking');
      if (status(200, response.status)) validate(bookingList, response.body, 'BookingList');
    } else if (scenario === 'missing') {
      const response = await request('GET', '/booking/' + Number.MAX_SAFE_INTEGER);
      status(404, response.status);
    } else {
      await authenticate();
      if (scenario === 'invalid') {
        const response = await request('POST', '/booking', { ...sample, totalprice: null });
        const parsed = bookingIdentifier.safeParse(response.body);
        if (response.status >= 200 && response.status < 300 && parsed.success) owned = parsed.data.bookingid;
        run.check('invalidRejected', 'HTTP 4xx', response.status, response.status >= 400 && response.status < 500);
      } else if (await create() && await readOwned(sample)) {
        if (scenario === 'put' || scenario === 'patch' || scenario === 'e2e') {
          const updated = { ...sample, totalprice: 425 };
          const method = scenario === 'patch' ? 'PATCH' : 'PUT';
          const response = await request(method, '/booking/' + owned, method === 'PATCH' ? { totalprice: 425 } : updated, token);
          if (response.status === 401 || response.status === 403) throw new RunError('authError');
          if (status(200, response.status)) {
            const observed = validate(booking, response.body, 'Booking');
            if (observed && run.check('ownership', true, identity.safeParse(observed).success)) compare(updated, observed);
            await readOwned(updated);
          }
        }
        if (scenario === 'delete' || scenario === 'e2e') await removeOwned(true);
      }
    }
  } catch (cause) {
    error = cause instanceof RunError ? cause.message : 'unexpected';
  } finally {
    if (owned !== undefined) {
      try {
        run.logs.push('cleanup');
        await removeOwned(false);
        if (owned !== undefined) run.logs.push('cleanupFailed');
      } catch {
        run.logs.push('cleanupFailed');
        error ??= 'cleanupFailed';
      }
    }
  }
  return run.finish(error);
}
