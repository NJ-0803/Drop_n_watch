import type { NextRequest } from 'next/server';
import { badRequest, cleanQuery, respond } from '@/lib/api';
import { searchSneakers, UK_SIZES } from '@/lib/sneakers';

export const maxDuration = 25;

export async function GET(request: NextRequest) {
  const q = cleanQuery(request.nextUrl.searchParams.get('q'));
  const size = request.nextUrl.searchParams.get('size') ?? '';
  if (q.length < 2) return badRequest('Type the sneaker you want.');
  if (!UK_SIZES.includes(size)) return badRequest('Pick your UK size.');
  return respond(await searchSneakers(q, size));
}
