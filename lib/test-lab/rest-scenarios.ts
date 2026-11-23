import { assertReply, createRestClient, customerExample, ownField, RestError, type Assertion, type Check, type Failure, type Operation, type Reply } from './rest-client';

export const scenarioIds = ['TC-API-001', 'TC-API-002', 'TC-API-003', 'TC-API-004', 'TC-API-005', 'TC-API-006', 'TC-API-007', 'TC-API-008'] as const;
export type RestStep = { operation: Operation; reply: Reply; checks: Check[] };
export type RestRun = { timestamp: string; duration: number; steps: RestStep[]; error?: Failure; httpStatus?: number };
const check = (kind: Assertion['kind'], expected: string, field = ''): Assertion => ({ kind, expected, field });
const code = (value: string) => check('equals', value, 'error.code');
export type ScenarioRequest = { operation: Operation; assertions: Assertion[]; needsCreatedId?: boolean };
function define(operation: Operation, status: number, assertions: Assertion[] = [], needsCreatedId = false): ScenarioRequest {
  return { operation, assertions: [check('status', String(status)), ...assertions], needsCreatedId };
}

const create = define({ endpoint: 'customers', method: 'POST', body: customerExample }, 201, [check('type', 'number', 'data.id'), check('equals', customerExample.name, 'data.name'), check('equals', customerExample.email, 'data.email'), check('equals', customerExample.status, 'data.status')]);
const getCreated = { endpoint: 'customer-by-id', method: 'GET' } as const;
const updated = [check('equals', 'Updated QA', 'data.name')];
const update = define({ ...getCreated, method: 'PATCH', body: { name: 'Updated QA' } }, 200, updated, true);
const verifyUpdate = define(getCreated, 200, updated, true);

export const scenarioRequests: readonly (readonly ScenarioRequest[])[] = [
  [define({ ...getCreated, id: '1' }, 200, [check('header', 'application/json', 'content-type'), ...['id', 'name', 'email', 'status'].map(field => check('exists', 'true', `data.${field}`))])],
  [create],
  [create, update, verifyUpdate],
  [define({ ...getCreated, id: '999' }, 404, [code('NOT_FOUND'), check('type', 'array', 'error.fields')])],
  [define({ endpoint: 'customers', method: 'POST', body: { ...customerExample, email: 'bad-email' } }, 422, [code('VALIDATION_ERROR'), check('equals', 'email', 'error.fields.0')])],
  [define({ endpoint: 'orders', method: 'POST', body: { customerId: 999, quantity: 2 } }, 409, [code('CUSTOMER_UNAVAILABLE')])],
  [define({ endpoint: 'orders', method: 'GET', query: 'page=1&limit=1' }, 200, [check('type', 'array', 'data'), check('type', 'number', 'data.0.id'), check('equals', '1', 'data.0.customerId'), check('equals', '2', 'data.0.quantity'), check('equals', '1', 'page'), check('equals', '1', 'limit'), check('type', 'number', 'total')])],
  [create, define(getCreated, 200, [check('equals', '', 'data.id'), check('equals', customerExample.name, 'data.name')], true), update, verifyUpdate, define({ ...getCreated, method: 'DELETE' }, 200, [check('equals', 'true', 'deleted')], true), define(getCreated, 404, [code('NOT_FOUND')], true)],
];

export async function runRestScenario(index: number, client = createRestClient()): Promise<RestRun> {
  const started = performance.now();
  const timestamp = new Date().toISOString();
  const steps: RestStep[] = [];
  let error: Failure | undefined;
  let httpStatus: number | undefined;
  let key: string | undefined;
  const recordError = (failure: unknown) => {
    if (error) return;
    error = failure instanceof RestError ? failure.kind : 'server';
    httpStatus = failure instanceof RestError ? failure.status : undefined;
  };

  async function step(operation: Operation, assertions: Assertion[]) {
    const reply = await client.request(key!, operation);
    if (reply.status === 429 || reply.status >= 500) throw new RestError('server', reply.status);
    steps.push({ operation, reply, checks: assertions.map(assertion => assertReply(reply, assertion)) });
    return reply;
  }

  try {
    const requests = scenarioRequests[index];
    if (!requests) throw new RestError('configuration');
    key = await client.open();
    let id: string | undefined;
    for (const request of requests) {
      if (request.needsCreatedId && !id) break;
      const operation = request.needsCreatedId ? { ...request.operation, id } : request.operation;
      const assertions = request.assertions.map(item => item.kind === 'equals' && item.field === 'data.id' && item.expected === '' ? { ...item, expected: id ?? '' } : item);
      const reply = await step(operation, assertions);
      if (request === create && requests.length > 1 && steps[0].checks.every(item => item.pass)) {
        const value = ownField(reply.body, 'data.id');
        if (typeof value === 'number' && /^[1-9]\d{0,8}$/.test(String(value))) id = String(value);
        else steps[0].checks.push({ kind: 'type', field: 'data.id', expected: 'positive resource ID', observed: value, pass: false });
      }
    }
  } catch (failure) { recordError(failure); }
  finally { if (key) try { await client.close(key); } catch (failure) { recordError(failure); } }
  return { timestamp, duration: performance.now() - started, steps, error, httpStatus };
}
