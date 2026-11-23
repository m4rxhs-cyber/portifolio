import { handleRest } from '@/lib/test-lab/rest-api';

export const runtime = 'nodejs';

async function dispatch(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handleRest(request, (await context.params).path);
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as PATCH, dispatch as DELETE };
