const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(outputText, filename);
};

const { runBooker } = require('../lib/test-lab/booker.ts');
const { runAuthentication, reproduceBug } = require('../lib/test-lab/local.ts');

process.env.BOOKER_USERNAME = 'unit-test';
process.env.BOOKER_PASSWORD = 'unit-test-password';

function mockBooker({ reuseId = false } = {}) {
  let record;
  const methods = [];
  const fetch = async (url, request) => {
    const path = new URL(url).pathname;
    const method = request.method;
    methods.push(method + ' ' + path);
    const input = request.body ? JSON.parse(request.body) : undefined;
    if (path === '/auth') return Response.json({ token: 'secret-test-token' });
    if (path === '/booking' && method === 'POST') {
      record = input;
      return Response.json({ bookingid: 42, booking: record });
    }
    if (method === 'GET') {
      return record ? Response.json(reuseId ? { ...record, lastname: 'Unrelated' } : record) : new Response('Not Found', { status: 404 });
    }
    assert.equal(request.headers.Cookie, 'token=secret-test-token');
    if (method === 'DELETE') {
      record = undefined;
      return new Response('Created', { status: 201 });
    }
    record = { ...record, ...input };
    return Response.json(record);
  };
  return { fetch, methods };
}

test('runs the isolated authentication scenarios and detects each synthetic defect', () => {
  for (let i = 0; i < 5; i++) assert.equal(runAuthentication(i).status, 'PASSED');
  for (let i = 0; i < 3; i++) {
    assert.equal(reproduceBug(i, true).status, 'FAILED');
    assert.equal(reproduceBug(i, false).status, 'PASSED');
  }
});

test('updates, verifies, deletes and redacts sensitive exchange data', async () => {
  const mock = mockBooker();
  const run = await runBooker('e2e', mock.fetch);
  assert.equal(run.status, 'PASSED');
  assert.deepEqual(mock.methods, [
    'POST /auth', 'POST /booking', 'GET /booking/42', 'PUT /booking/42',
    'GET /booking/42', 'GET /booking/42', 'DELETE /booking/42', 'GET /booking/42',
  ]);
  assert.doesNotMatch(JSON.stringify(run), /unit-test-password|secret-test-token/);
});

test('refuses writes when the returned ID points to an unrelated booking', async () => {
  const mock = mockBooker({ reuseId: true });
  const run = await runBooker('put', mock.fetch);
  assert.equal(run.status, 'ERROR');
  assert.equal(run.error, 'ownership');
  assert.ok(!mock.methods.some((method) => /^(PUT|DELETE)/.test(method)));
  assert.doesNotMatch(JSON.stringify(run), /Unrelated/);
});

test('checks the actual list contract and classifies technical errors', async () => {
  assert.equal((await runBooker('list', async () => Response.json([]))).status, 'PASSED');
  assert.equal((await runBooker('list', async () => Response.json([{ bookingid: '42' }]))).status, 'FAILED');
  assert.equal((await runBooker('ping', async () => new Response(null, { status: 503 }))).error, 'upstream');
  const result = await runBooker('ping', (_, { signal }) => new Promise((_, reject) => {
    const keepAlive = setInterval(() => {}, 500);
    signal.addEventListener('abort', () => { clearInterval(keepAlive); reject(signal.reason); }, { once: true });
  }));
  assert.equal(result.error, 'timeout');
  assert.equal(result.status, 'ERROR');
});
