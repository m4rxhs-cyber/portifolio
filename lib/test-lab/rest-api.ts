import { createHash, randomBytes } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const ttl = 15 * 60_000;
const customerFields = { name: z.string().trim().min(1).max(80), email: z.email().max(120), status: z.enum(['active', 'inactive']) };
const customerInput = z.strictObject(customerFields);
const patchInput = customerInput.partial().refine(value => Object.keys(value).length > 0);
const orderInput = z.strictObject({ customerId: z.int().positive(), quantity: z.int().min(1).max(20) });
type State = { expires: number; next: number; customers: (z.infer<typeof customerInput> & { id: number })[]; orders: (z.infer<typeof orderInput> & { id: number })[] };
let windowStart = 0;
let requests = 0;
let pending = 0;

function json(status: number, body: object, headers?: Record<string, string>) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
function error(status: number, code: string, fields: string[] = [], headers?: Record<string, string>) {
  return json(status, { error: { code, fields } }, headers);
}
function errno(value: unknown, code: string) { return (value as NodeJS.ErrnoException)?.code === code; }
async function remove(file: string) { try { await unlink(file); } catch (value) { if (!errno(value, 'ENOENT')) throw value; } }

async function body(request: Request) {
  if (request.headers.get('content-type')?.toLowerCase().split(';')[0].trim() !== 'application/json') return { failure: error(415, 'JSON_REQUIRED') };
  const reader = request.body?.getReader();
  if (!reader) return { failure: error(400, 'INVALID_JSON') };
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  let expired = false;
  const timer = setTimeout(() => { expired = true; void reader.cancel().catch(() => {}); }, 2000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { void reader.cancel().catch(() => {}); return { failure: error(413, 'BODY_TOO_LARGE') }; }
      text += decoder.decode(value, { stream: true });
    }
    if (expired) return { failure: error(408, 'BODY_TIMEOUT') };
    return { value: JSON.parse(text + decoder.decode()) as unknown };
  } catch { return { failure: error(400, 'INVALID_JSON') }; }
  finally { clearTimeout(timer); }
}

export async function handleRest(request: Request, path: string[]) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== url.origin)) return error(403, 'ORIGIN_DENIED');
  const [resource, rawId] = path;
  const method = request.method;
  const workspace = resource === 'workspace';
  if (path.length > 2 || (workspace ? path.length !== 1 : !['customers', 'orders'].includes(resource) || (rawId !== undefined && !/^[1-9]\d{0,8}$/.test(rawId)))) return error(404, 'ROUTE_NOT_ALLOWED');
  const allowed = workspace ? ['POST', 'DELETE'] : !rawId ? ['GET', 'POST'] : resource === 'customers' ? ['GET', 'PUT', 'PATCH', 'DELETE'] : ['GET'];
  if (!allowed.includes(method)) return error(405, 'METHOD_NOT_ALLOWED', [], { Allow: allowed.join(', ') });
  if (url.search.length > 180) return error(400, 'INVALID_QUERY');
  const params = [...url.searchParams];
  const page = url.searchParams.get('page') ?? '1';
  const limit = url.searchParams.get('limit') ?? '10';
  const status = url.searchParams.get('status');
  const list = !workspace && !rawId && method === 'GET';
  if ((!list && params.length) || new Set(params.map(([name]) => name)).size !== params.length || params.some(([name]) => !['page', 'limit', ...(resource === 'customers' ? ['status'] : [])].includes(name)) || !/^[1-9]\d?$/.test(page) || !/^[1-9]\d?$/.test(limit) || Number(limit) > 20 || (status !== null && !['active', 'inactive'].includes(status))) return error(400, 'INVALID_QUERY');
  const now = Date.now();
  if (now - windowStart >= 60_000) { windowStart = now; requests = 0; }
  if (requests >= 240 || pending >= 12) return error(429, 'RATE_LIMITED', [], { 'Retry-After': '60' });
  requests++;
  pending++;
  try {
    const dir = process.env.LAB_REST_WORKSPACE_DIR || join(tmpdir(), 'engineering-dark-demo-rest');
    const fileFor = (key: string) => join(dir, createHash('sha256').update(key).digest('hex') + '.json');
    if (workspace && method === 'POST') {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const workspaceFile = /^[a-f0-9]{64}\.json$/;
      const files = (await readdir(dir)).filter(name => /^[a-f0-9]{64}\.json(?:\.(?:lock|pending))?$/.test(name));
      await Promise.all(files.map(async name => {
        const file = join(dir, name);
        try { if ((await stat(file)).mtimeMs < now - ttl) await remove(file); } catch (value) { if (!errno(value, 'ENOENT')) throw value; }
      }));
      if (files.length >= 500 && (await readdir(dir)).filter(name => workspaceFile.test(name)).length >= 500) return error(429, 'CAPACITY_REACHED');
      const key = randomBytes(32).toString('hex');
      const seed: State = { expires: now + ttl, next: 3, customers: [{ id: 1, name: 'Demo Customer', email: 'customer@example.test', status: 'active' }], orders: [{ id: 2, customerId: 1, quantity: 2 }] };
      await writeFile(fileFor(key), JSON.stringify(seed), { flag: 'wx', mode: 0o600 });
      return json(201, { workspace: key });
    }
    const key = request.headers.get('x-demo-workspace');
    if (!key || !/^[a-f0-9]{64}$/.test(key)) return error(401, 'WORKSPACE_REQUIRED');
    const file = fileFor(key);
    const lock = file + '.lock';
    // The exclusive file coordinates writes across workers sharing this volume.
    let handle;
    try { handle = await open(lock, 'wx', 0o600); }
    catch (value) { return errno(value, 'EEXIST') ? error(409, 'WORKSPACE_BUSY') : errno(value, 'ENOENT') ? error(410, 'WORKSPACE_EXPIRED') : error(500, 'INTERNAL_ERROR'); }
    try {
      let state: State;
      try { state = JSON.parse(await readFile(file, 'utf8')); }
      catch (value) { if (errno(value, 'ENOENT')) return error(410, 'WORKSPACE_EXPIRED'); throw value; }
      if (state.expires <= now) { await remove(file); return error(410, 'WORKSPACE_EXPIRED'); }
      if (workspace) { await remove(file); return json(200, { deleted: true }); }
      const data = resource === 'customers' ? state.customers : state.orders;
      const id = Number(rawId);
      const index = data.findIndex(item => item.id === id);
      if (method === 'GET') {
        if (rawId) return index < 0 ? error(404, 'NOT_FOUND') : json(200, { data: data[index] });
        const filtered = status ? state.customers.filter(item => item.status === status) : data;
        const offset = (Number(page) - 1) * Number(limit);
        return json(200, { data: filtered.slice(offset, offset + Number(limit)), page: Number(page), limit: Number(limit), total: filtered.length });
      }
      if (rawId && index < 0) return error(404, 'NOT_FOUND');
      let response: Response;
      if (method === 'DELETE') {
        if (state.orders.some(order => order.customerId === id)) return error(409, 'CUSTOMER_HAS_ORDERS');
        state.customers.splice(index, 1);
        response = json(200, { deleted: true, id });
      } else {
        const parsed = await body(request);
        if (parsed.failure) return parsed.failure;
        if (method === 'POST' && data.length >= 30) return error(409, 'RESOURCE_LIMIT');
        if (resource === 'customers') {
          const input = (method === 'PATCH' ? patchInput : customerInput).safeParse(parsed.value);
          if (!input.success) return error(422, 'VALIDATION_ERROR', input.error.issues.map(issue => issue.path[0]).filter((field): field is string => typeof field === 'string' && ['name', 'email', 'status'].includes(field)));
          const next = customerInput.parse({ ...(method === 'PATCH' ? { name: state.customers[index].name, email: state.customers[index].email, status: state.customers[index].status } : {}), ...input.data });
          const item = { id: rawId ? id : state.next++, ...next };
          if (rawId) state.customers[index] = item; else state.customers.push(item);
          response = json(rawId ? 200 : 201, { data: item });
        } else {
          const input = orderInput.safeParse(parsed.value);
          if (!input.success) return error(422, 'VALIDATION_ERROR', input.error.issues.map(issue => issue.path[0]).filter((field): field is string => field === 'customerId' || field === 'quantity'));
          if (!state.customers.some(item => item.id === input.data.customerId && item.status === 'active')) return error(409, 'CUSTOMER_UNAVAILABLE');
          const item = { id: state.next++, ...input.data };
          state.orders.push(item);
          response = json(201, { data: item });
        }
      }
      const temporary = file + '.pending';
      try { await writeFile(temporary, JSON.stringify(state), { mode: 0o600 }); await rename(temporary, file); }
      finally { await remove(temporary); }
      return response;
    } finally { await handle.close(); await remove(lock); }
  } catch { return error(500, 'INTERNAL_ERROR'); }
  finally { pending--; }
}
