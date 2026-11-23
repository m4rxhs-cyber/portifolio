export const endpoints = {
  customers: ['GET', 'POST'], 'customer-by-id': ['GET', 'PUT', 'PATCH', 'DELETE'],
  orders: ['GET', 'POST'], 'order-by-id': ['GET'],
} as const;
export type Endpoint = keyof typeof endpoints;
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type Operation = { endpoint: Endpoint; method: Method; id?: string; query?: string; body?: unknown; headers?: Record<string, string> };
export type Reply = { status: number; duration: number; bytes: number; headers: Record<string, string>; body: unknown };
export const operators = ['status', 'duration', 'exists', 'equals', 'type', 'header'] as const;
export type Assertion = { kind: typeof operators[number]; field: string; expected: string };
export type Check = { kind: Assertion['kind']; field: string; expected: unknown; observed: unknown; pass: boolean };
export type Failure = 'network' | 'timeout' | 'response' | 'workspace' | 'configuration' | 'server';
export class RestError extends Error { constructor(readonly kind: Failure, readonly status?: number) { super(kind); } }

export function ownField(body: unknown, path: string): unknown {
  if (!/^[\w-]+(?:\.[\w-]+)*$/.test(path) || path.length > 100) return undefined;
  return path.split('.').reduce<unknown>((value, key) => value !== null && typeof value === 'object' && Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined, body);
}

export function assertReply(reply: Reply, assertion: Assertion): Check {
  const { kind, field } = assertion;
  const value = ownField(reply.body, field);
  let expected: unknown = assertion.expected;
  let observed: unknown;
  switch (kind) {
    case 'status': expected = Number(expected); observed = reply.status; break;
    case 'duration': expected = Number(expected); observed = Math.round(reply.duration); break;
    case 'exists': expected = true; observed = value !== undefined; break;
    case 'type': observed = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value; break;
    case 'header': observed = Object.hasOwn(reply.headers, field.toLowerCase()) ? reply.headers[field.toLowerCase()] : undefined; break;
    case 'equals':
      try { expected = JSON.parse(assertion.expected); } catch { expected = assertion.expected; }
      observed = value;
  }
  const pass = kind === 'duration' ? reply.duration <= Number(expected) : Object.is(expected, observed);
  return { kind, field, expected, observed, pass };
}

export const restPrefix = '/api/test-lab/rest/';
const allowedHeaders = new Set(['accept', 'content-type', 'x-demo-request-id']);
const visibleHeaders = ['content-type', 'cache-control', 'allow', 'retry-after'];
export const supportsBody = (method: Method) => method === 'POST' || method === 'PUT' || method === 'PATCH';
export function endpointPath(endpoint: Endpoint, id = ':id') {
  if (endpoint === 'customer-by-id') return `customers/${id}`;
  if (endpoint === 'order-by-id') return `orders/${id}`;
  return endpoint;
}
export const hasPathId = (endpoint: Endpoint) => endpoint.endsWith('-by-id');
export const validPathId = (id: string) => /^[1-9]\d{0,8}$/.test(id);
export function requestPath(endpoint: Endpoint, id?: string, query?: string) {
  const search = new URLSearchParams(query).toString();
  return endpointPath(endpoint, id && validPathId(id) ? encodeURIComponent(id) : undefined) + (search ? `?${search}` : '');
}

export function createRestClient(transport: typeof fetch = fetch, timeout = 7000) {
  async function send(path: string, method: Method, workspace?: string, input?: unknown, additional: Record<string, string> = {}): Promise<Reply> {
    const signal = AbortSignal.timeout(timeout);
    const start = performance.now();
    try {
      const response = await transport(restPrefix + path, {
        method, signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: { Accept: 'application/json', ...(input === undefined ? {} : { 'Content-Type': 'application/json' }), ...additional, ...(workspace ? { 'X-Demo-Workspace': workspace } : {}) },
        body: input === undefined ? undefined : JSON.stringify(input),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new RestError('response', response.status);
      let bytes = 0;
      let text = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 32768) { void reader.cancel().catch(() => {}); throw new RestError('response', response.status); }
        text += decoder.decode(value, { stream: true });
      }
      let body: unknown;
      try { body = JSON.parse(text + decoder.decode()); } catch { throw new RestError('response', response.status); }
      return { status: response.status, duration: performance.now() - start, bytes, body, headers: Object.fromEntries(visibleHeaders.flatMap(name => { const value = response.headers.get(name); return value ? [[name, value]] : []; })) };
    } catch (error) {
      if (signal.aborted) throw new RestError('timeout');
      if (error instanceof RestError) throw error;
      throw new RestError('network');
    }
  }
  return {
    async open() {
      const result = await send('workspace', 'POST');
      const key = ownField(result.body, 'workspace');
      if (result.status !== 201 || typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw new RestError('workspace', result.status);
      return key;
    },
    async close(key: string) {
      const result = await send('workspace', 'DELETE', key);
      if (![200, 410].includes(result.status)) throw new RestError('workspace', result.status);
    },
    async request(key: string, operation: Operation) {
      const { endpoint, method, id, query, body, headers } = operation;
      const defined = Object.hasOwn(endpoints, endpoint) && (endpoints[endpoint] as readonly Method[]).includes(method);
      if (!defined || (hasPathId(endpoint) && !validPathId(id ?? '')) || Object.entries(headers ?? {}).some(([name, value]) => !allowedHeaders.has(name.toLowerCase()) || value.length > 120 || /[\r\n]/.test(value))) throw new RestError('configuration');
      if (supportsBody(method) && new TextEncoder().encode(JSON.stringify(body)).length > 4096) throw new RestError('configuration');
      return send(requestPath(endpoint, id, query), method, key, supportsBody(method) ? body : undefined, headers);
    },
  };
}

export type RestClient = ReturnType<typeof createRestClient>;
export const customerExample = { name: 'Demo QA', email: 'qa@example.test', status: 'active' };
