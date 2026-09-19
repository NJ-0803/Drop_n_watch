import type { NextRequest } from 'next/server';
import { badRequest, cleanQuery, respond } from '@/lib/api';
import { searchRetail } from '@/lib/retail';

export const maxDuration = 25;

export async function GET(request: NextRequest) {
  const q = cleanQuery(request.nextUrl.searchParams.get('q'));
  if (q.length < 2) return badRequest('Type what you are looking for.');
  return respond(await searchRetail(q));
}
