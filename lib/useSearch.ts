'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import type { LinkResult, LinkSource, LinkVerdict } from '@/lib/link';
import type { Kind } from '@/lib/saved';
import type { SearchResult } from '@/lib/types';

export type LinkInfo = { source: LinkSource; verdict: LinkVerdict };

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string; size?: string; link?: boolean }
  | { status: 'done'; result: SearchResult; link?: LinkInfo }
  | { status: 'error'; query: string; error: string };

export { looksLikeLink } from '@/lib/linkParse';

export function searchUrl(kind: Kind, q: string, size?: string) {
  const params = new URLSearchParams({ q });
  if (size) params.set('size', size);
  return `/api/${kind === 'retail' ? 'search' : 'sneakers'}?${params}`;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(body?.error ?? 'Something went wrong. Try again.');
  return body as T;
}

export const fetchResult = (kind: Kind, q: string, size?: string, signal?: AbortSignal) =>
  getJson<SearchResult>(searchUrl(kind, q, size), signal);

export const fetchLink = (url: string, signal?: AbortSignal) => getJson<LinkResult>(`/api/link?${new URLSearchParams({ url })}`, signal);

/** Runs a search, cancelling any earlier one, and mirrors it into the address bar so it can be shared. */
export function useSearch(kind: Kind) {
  const router = useRouter();
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const inflight = useRef<AbortController | null>(null);

  const start = (params: Record<string, string>) => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    window.history.replaceState(null, '', `?${new URLSearchParams(params)}`);
    return ctrl;
  };
  const fail = (ctrl: AbortController, query: string, e: unknown) => {
    if (ctrl.signal.aborted) return;
    setState({ status: 'error', query, error: navigator.onLine ? (e as Error).message : 'You seem to be offline.' });
  };

  const run = useCallback(
    async (q: string, size?: string) => {
      const ctrl = start(size ? { q, size } : { q });
      setState({ status: 'loading', query: q, size });
      try {
        const result = await fetchResult(kind, q, size, ctrl.signal);
        setState({ status: 'done', result });
      } catch (e) {
        fail(ctrl, q, e);
      }
    },
    [kind],
  );

  /**
   * A pasted link: the server works out the product and compares stores.
   * Sneaker-store links are re-run as a size-aware sneaker search.
   */
  const runLink = useCallback(
    async (url: string, size?: string) => {
      const ctrl = start({ url });
      setState({ status: 'loading', query: url, size, link: true });
      try {
        const res = await fetchLink(url, ctrl.signal);
        if (res.mode === 'sneakers' || kind === 'sneakers') {
          if (kind !== 'sneakers') {
            router.push(`/sneakers?${new URLSearchParams({ q: res.query })}`);
            return;
          }
          if (!size) throw new Error('Pick your size first, then paste the link again.');
          const result = await fetchResult('sneakers', res.query, size, ctrl.signal);
          setState({ status: 'done', result });
          return;
        }
        setState({ status: 'done', result: res.result, link: { source: res.source, verdict: res.verdict } });
      } catch (e) {
        fail(ctrl, url, e);
      }
    },
    [kind, router],
  );

  return { state, run, runLink };
}
