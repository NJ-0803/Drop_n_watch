import type { NextRequest } from 'next/server';
import { badRequest, cleanQuery, respond, streamRespond } from '@/lib/api';
import { collect } from '@/lib/collect';
import { retailPlan } from '@/lib/retail';

export const maxDuration = 25;

export async function GET(request: NextRequest) {
  const q = cleanQuery(request.nextUrl.searchParams.get('q'));
  if (q.length < 2) return badRequest('Type what you are looking for.');
  const plan = retailPlan(q);
  return request.nextUrl.searchParams.get('stream') === '1' ? streamRespond(plan) : respond(await collect(plan));
}
