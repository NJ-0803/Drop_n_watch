import type { NextRequest } from 'next/server';
import { badRequest } from '@/lib/api';
import { checkLink, LinkError } from '@/lib/link';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = (request.nextUrl.searchParams.get('url') ?? '').trim().slice(0, 2000);
  if (!url) return badRequest('Paste a product link.');
  try {
    const result = await checkLink(url);
    const anyOk = result.mode === 'sneakers' || result.result.stores.some(s => s.ok);
    return Response.json(result, {
      headers: { 'Cache-Control': anyOk ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store' },
    });
  } catch (e) {
    if (e instanceof LinkError) return badRequest(e.message);
    console.error('[link]', e);
    return Response.json({ error: 'Something went wrong reading that link. Try again.' }, { status: 500 });
  }
}
