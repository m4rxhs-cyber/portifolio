import { demoCustomer } from '@/lib/test-lab/investigation-model';

export function GET() {
  return Response.json(demoCustomer, { headers: { 'Cache-Control': 'no-store' } });
}
