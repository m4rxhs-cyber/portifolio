import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runBooker } from '@/lib/test-lab/booker';
import { apiCases, type ApiCase } from '@/lib/test-lab/model';

export const runtime = 'nodejs';
export const maxDuration = 60;

const allowed = new Set<string>(apiCases.map(([id]) => id));
const readOnly = new Set<ApiCase>(['ping', 'list', 'missing']);
const limitWindow = 60_000;
const maxInput = 512;
let windowStart = 0;
let used = 0;
let inFlight = 0;
let writing = false;

export async function POST(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return NextResponse.json({ error: 'invalidInput' }, { status: 400 });
  }
  const now = Date.now();
  if (now - windowStart >= limitWindow) {
    windowStart = now;
    used = 0;
  }
  if (used >= 12 || inFlight >= 3) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  used++;
  inFlight++;
  let acquiredWrite = false;
  try {
    const stream = request.body?.getReader();
    if (!stream) return NextResponse.json({ error: 'invalidInput' }, { status: 400 });
    let size = 0;
    let raw = '';
    const decoder = new TextDecoder();
    const timer = setTimeout(() => { void stream.cancel().catch(() => {}); }, 2500);
    try {
      while (true) {
        const { value, done } = await stream.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxInput) {
          void stream.cancel().catch(() => {});
          return NextResponse.json({ error: 'invalidInput' }, { status: 413 });
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      clearTimeout(timer);
    }
    const parsed = z.strictObject({ scenario: z.string().refine((id) => allowed.has(id)) }).safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: 'invalidInput' }, { status: 400 });
    const scenario = parsed.data.scenario as ApiCase;
    if (!readOnly.has(scenario)) {
      if (writing) return NextResponse.json({ error: 'rateLimited' }, { status: 429, headers: { 'Retry-After': '5' } });
      writing = acquiredWrite = true;
    }
    return NextResponse.json(await runBooker(scenario), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'invalidInput' }, { status: 400 });
  } finally {
    if (acquiredWrite) writing = false;
    inFlight--;
  }
}
