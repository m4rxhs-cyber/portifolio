import { handleAuth } from '@/lib/test-lab/auth-api';

export const runtime = 'nodejs';

type Context = { params: Promise<{ action: string }> };

export async function GET(request: Request, { params }: Context) {
  if ((await params).action !== 'session') return new Response(null, { status: 404 });
  return handleAuth(request, 'session');
}

export async function POST(request: Request, { params }: Context) {
  const { action } = await params;
  if (action !== 'login' && action !== 'logout') return new Response(null, { status: 404 });
  return handleAuth(request, action);
}
