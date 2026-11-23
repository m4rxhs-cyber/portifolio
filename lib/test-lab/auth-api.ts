import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const ttl = 120_000;
const credentials = z.strictObject({ email: z.email().max(120), password: z.string().min(1).max(80) });
const tokenFormat = /^Bearer ([a-f0-9]{64})$/;
const sessionFile = /^[a-f0-9]{64}\.json$/;
let windowStart = 0;
let used = 0;
let pending = 0;

function reply(status: number, code: string, authenticated = false, extra = {}) {
  return Response.json({ code, authenticated, ...extra }, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
}

async function readInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder();
  let size = 0;
  let raw = '';
  const timer = setTimeout(() => { void reader.cancel().catch(() => {}); }, 2000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { void reader.cancel().catch(() => {}); return undefined; }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode()) as unknown;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function missing(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

async function remove(file: string) {
  try { await unlink(file); } catch (error) { if (!missing(error)) throw error; }
}

async function expiry(file: string) {
  try { return Number(await readFile(file, 'utf8')); } catch (error) { if (missing(error)) return 0; throw error; }
}

export async function handleAuth(request: Request, action: 'login' | 'session' | 'logout') {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) return reply(403, 'ORIGIN_DENIED');
  const now = Date.now();
  if (now - windowStart >= 60_000) { windowStart = now; used = 0; }
  if (used >= 180 || pending >= 12) return reply(429, 'RATE_LIMITED');
  used++;
  pending++;
  try {
    const directory = process.env.LAB_AUTH_SESSION_DIR || join(tmpdir(), 'engineering-dark-demo-auth');
    const fileFor = (token: string) => join(directory, `${createHash('sha256').update(token).digest('hex')}.json`);

    if (action === 'login') {
      const input = credentials.safeParse(request.headers.get('content-type')?.split(';')[0].trim() === 'application/json' ? await readInput(request) : undefined);
      if (!input.success) return reply(400, 'INVALID_INPUT', false, { message: 'Provide a valid demo email (up to 120 characters) and a password of 1–80 characters.' });
      const { email, password } = input.data;
      if (password !== 'demo-password') return reply(401, 'INVALID_CREDENTIALS');
      if (email === 'locked@example.test') return reply(403, 'ACCOUNT_LOCKED');
      if (email !== 'demo@example.test') return reply(401, 'INVALID_CREDENTIALS');

      await mkdir(directory, { recursive: true, mode: 0o700 });
      await Promise.all((await readdir(directory)).filter(name => sessionFile.test(name)).map(async name => {
        const file = join(directory, name);
        const expires = await expiry(file);
        if (expires > 0 && expires <= now) await remove(file);
      }));
      const token = randomBytes(32).toString('hex');
      await writeFile(fileFor(token), String(Date.now() + ttl), { flag: 'wx', mode: 0o600 });
      return reply(200, 'SIGNED_IN', true, { token });
    }

    const token = request.headers.get('authorization')?.match(tokenFormat)?.[1];
    if (!token) return reply(401, 'SESSION_REQUIRED');
    const file = fileFor(token);
    const expires = await expiry(file);
    if (!expires || expires <= Date.now()) {
      if (expires) await remove(file);
      return reply(401, 'SESSION_INVALID');
    }
    if (action === 'session') return reply(200, 'AUTHORIZED', true);
    await remove(file);
    return reply(200, 'SIGNED_OUT');
  } catch {
    return reply(500, 'INTERNAL_ERROR');
  } finally {
    pending--;
  }
}
