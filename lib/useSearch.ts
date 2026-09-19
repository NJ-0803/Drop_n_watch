'use client';

import { useCallback, useRef, useState } from 'react';
import type { Kind } from '@/lib/saved';
import type { SearchResult } from '@/lib/types';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string; size?: string }
  | { status: 'done'; result: SearchResult }
  | { status: 'error'; query: string; error: string };

export function searchUrl(kind: Kind, q: string, size?: string) {
  const params = new URLSearchParams({ q });
  if (size) params.set('size', size);
  return `/api/${kind === 'retail' ? 'search' : 'sneakers'}?${params}`;
}

export async function fetchResult(kind: Kind, q: string, size?: string, signal?: AbortSignal): Promise<SearchResult> {
  const res = await fetch(searchUrl(kind, q, size), { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(body?.error ?? 'Something went wrong. Try again.');
  return body as SearchResult;
}

/** Runs a search, cancelling any earlier one, and mirrors it into the address bar so it can be shared. */
export function useSearch(kind: Kind) {
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const inflight = useRef<AbortController | null>(null);

  const run = useCallback(
    async (q: string, size?: string) => {
      inflight.current?.abort();
      const ctrl = new AbortController();
      inflight.current = ctrl;
      setState({ status: 'loading', query: q, size });
      const params = new URLSearchParams({ q });
      if (size) params.set('size', size);
      window.history.replaceState(null, '', `?${params}`);
      try {
        const result = await fetchResult(kind, q, size, ctrl.signal);
        setState({ status: 'done', result });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', query: q, error: navigator.onLine ? (e as Error).message : 'You seem to be offline.' });
      }
    },
    [kind],
  );

  return { state, run };
}
