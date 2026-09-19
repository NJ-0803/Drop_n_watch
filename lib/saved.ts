'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OfferGroup } from '@/lib/types';

// Saved items live in this browser only: no account, nothing leaves the device.
export type Kind = 'retail' | 'sneakers';
export type SavedItem = {
  id: string;
  kind: Kind;
  query: string;
  size?: string;
  title: string;
  image?: string;
  /** Every listing URL in the group, so a later search can find the same product. */
  urls: string[];
  savedPrice: number | null;
  lastPrice: number | null;
  lastStore?: string;
  lastUrl?: string;
  checkedAt: string;
  /** Sound alert on for this item. */
  alert?: boolean;
  /** Alert when the price reaches this; empty means "any new low". */
  target?: number | null;
  /** Lowest price seen since saving. */
  lowest?: number | null;
  /** The price we last alerted at, so the same drop doesn't chime twice. */
  alertedPrice?: number | null;
};

const KEY = 'dw-saved-v1';
const EVENT = 'dw-saved-change';

function read(): SavedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: SavedItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)));
  } catch {
    /* storage full or blocked: saving is a convenience, not critical */
  }
  window.dispatchEvent(new Event(EVENT));
}

export const readSaved = read;
export const writeSaved = write;

export const savedId = (kind: Kind, group: OfferGroup, size?: string) => `${kind}:${size ?? ''}:${group.key}`;

export function useSaved(kind: Kind) {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(read().filter(i => i.kind === kind));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [kind]);

  const toggle = useCallback(
    (group: OfferGroup, query: string, size?: string) => {
      const id = savedId(kind, group, size);
      const all = read();
      if (all.some(i => i.id === id)) return write(all.filter(i => i.id !== id));
      const best = group.best;
      write([
        {
          id,
          kind,
          query,
          size,
          title: group.title,
          image: group.image,
          urls: group.offers.map(o => o.url),
          savedPrice: best?.price ?? null,
          lastPrice: best?.price ?? null,
          lastStore: best?.storeName,
          lastUrl: best?.url,
          checkedAt: new Date().toISOString(),
          lowest: best?.price ?? null,
        },
        ...all,
      ]);
    },
    [kind],
  );

  const remove = useCallback((id: string) => write(read().filter(i => i.id !== id)), []);

  const update = useCallback((id: string, patch: Partial<SavedItem>) => {
    write(read().map(i => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  return { items, toggle, remove, update, has: (id: string) => items.some(i => i.id === id) };
}
