'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import type { LinkResult, LinkSource, LinkVerdict } from '@/lib/link';
import type { Kind } from '@/lib/saved';
import type { StreamLine } from '@/lib/api';
import { summarize, type StoreReport } from '@/lib/summarize';
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

/**
 * Streams a search: calls `onUpdate` with a fresh result each time a store
 * answers, and once more when all have. If the stream breaks off, stores that
 * never answered are reported as timed out.
 */
export async function streamResult(
  kind: Kind,
  q: string,
  size: string | undefined,
  signal: AbortSignal,
  onUpdate: (result: SearchResult) => void,
): Promise<void> {
  const res = await fetch(`${searchUrl(kind, q, size)}&stream=1`, { signal });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? 'Something went wrong. Try again.');
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let start: Extract<StreamLine, { type: 'start' }> | undefined;
  const reports: StoreReport[] = [];
  let buffer = '';
  let ended = false;
  const waitingOn = () => (start?.stores ?? []).filter(s => !reports.some(r => r.store === s.store));

  while (!ended) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
      const line = JSON.parse(buffer.slice(0, i)) as StreamLine;
      buffer = buffer.slice(i + 1);
      if (line.type === 'start') start = line;
      else if (line.type === 'store' && start) {
        reports.push(line.report);
        onUpdate(summarize(start.query, reports, start.opts, waitingOn().map(s => s.storeName)));
      } else if (line.type === 'end') ended = true;
    }
  }
  if (!start) throw new Error('Something went wrong. Try again.');
  for (const s of waitingOn()) reports.push({ ...s, ok: false, offers: [], error: 'timed out' });
  onUpdate(summarize(start.query, reports, start.opts));
}

// Finished results are kept for five minutes (in memory, and per tab in sessionStorage) so a repeated
// search, the back button or a prefetched suggestion shows instantly without touching the network.
const CACHE_MS = 5 * 60 * 1000;
const memory = new Map<string, { at: number; result: SearchResult }>();
const prefetching = new Map<string, Promise<SearchResult | null>>();
const cacheKey = (kind: Kind, q: string, size?: string) => `${kind}|${q.trim().toLowerCase()}|${size ?? ''}`;

function cached(key: string): SearchResult | undefined {
  let hit = memory.get(key);
  if (!hit) {
    try {
      const raw = sessionStorage.getItem(`dw-cache:${key}`);
      if (raw) hit = JSON.parse(raw) as { at: number; result: SearchResult };
    } catch {}
  }
  return hit && Date.now() - hit.at < CACHE_MS ? hit.result : undefined;
}

function remember(key: string, result: SearchResult) {
  if (result.pending?.length || !result.stores.some(s => s.ok)) return;
  const entry = { at: Date.now(), result };
  memory.set(key, entry);
  try {
    sessionStorage.setItem(`dw-cache:${key}`, JSON.stringify(entry));
  } catch {}
}

/**
 * Starts a search in the background (a hovered suggestion) so it's ready by the time it's clicked. A click
 * before it finishes streams as usual; the server shares the store requests already in flight.
 */
export function prefetch(kind: Kind, q: string, size?: string) {
  const key = cacheKey(kind, q, size);
  if (cached(key) || prefetching.has(key)) return;
  let last: SearchResult | null = null;
  const job = streamResult(kind, q, size, new AbortController().signal, r => (last = r))
    .then(() => {
      if (last) remember(key, last);
      return last;
    })
    .catch(() => null)
    .finally(() => prefetching.delete(key));
  prefetching.set(key, job);
}

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
      const key = cacheKey(kind, q, size);
      const hit = cached(key);
      if (hit) return setState({ status: 'done', result: hit });
      setState({ status: 'loading', query: q, size });
      try {
        await streamResult(kind, q, size, ctrl.signal, result => {
          if (ctrl.signal.aborted) return;
          setState({ status: 'done', result });
          remember(key, result);
        });
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
