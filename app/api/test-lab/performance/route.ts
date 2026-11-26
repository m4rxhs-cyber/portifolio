import { createGate, runHttp } from '../../../../lib/test-lab/performance-http';
import { validConfiguration } from '../../../../lib/test-lab/performance-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const acquire = createGate();
const fixtures = { customers: [{ id: 1, status: 'active' }], orders: [{ id: 1, quantity: 2 }] } as const;
function local(request: Request) {
  return process.env.NODE_ENV === 'development' && process.env.LAB_PERFORMANCE_LOCAL === '1'
    && ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
}
const failure = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export function GET(request: Request) {
  if (!local(request)) return failure('unavailable', 403);
  const fixture = new URL(request.url).searchParams.get('fixture');
  if (fixture !== 'customers' && fixture !== 'orders') return failure('invalid', 400);
  return Response.json(fixtures[fixture], { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!local(request)) return failure('unavailable', 403);
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') return failure('unavailable', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid', 400);
  let configuration: unknown;
  const reader = request.body?.getReader();
  if (!reader) return failure('invalid', 400);
  const timeout = setTimeout(() => { void reader.cancel().catch(() => {}); }, 1500);
  try {
    const decoder = new TextDecoder();
    let size = 0;
    let body = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) { void reader.cancel().catch(() => {}); return failure('invalid', 400); }
      body += decoder.decode(value, { stream: true });
    }
    configuration = JSON.parse(body + decoder.decode());
  } catch { return failure('invalid', 400); }
  finally { clearTimeout(timeout); }
  if (!validConfiguration(configuration, 'http')) return failure('invalid', 400);
  const port = process.env.LAB_PERFORMANCE_PORT ?? process.env.PORT ?? '3000';
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) return failure('unavailable', 503);
  const release = acquire();
  if (typeof release !== 'function') return failure(release, 429);

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      void (async () => {
        try {
          await runHttp(configuration, 'http://127.0.0.1:' + port, signal, interval => send({ interval }));
          if (!signal.aborted) send({ done: true });
        } catch {
          if (!signal.aborted) send({ error: 'internal' });
        } finally {
          release();
          if (!abort.signal.aborted) controller.close();
        }
      })();
    },
    cancel() { abort.abort(); },
  }), { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}
