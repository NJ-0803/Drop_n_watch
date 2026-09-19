'use client';

import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ago, money } from '@/lib/format';
import { useSaved, type Kind, type SavedItem } from '@/lib/saved';
import { fetchResult } from '@/lib/useSearch';
import { LIFT } from './motion';
import { PressButton } from './PressButton';

const STALE_MS = 10 * 60 * 1000;
const MAX_AUTO_CHECKS = 8;

/** Re-checks a saved product by re-running its search and finding the group that holds one of its listings. */
async function recheck(item: SavedItem): Promise<Partial<SavedItem>> {
  const result = await fetchResult(item.kind, item.query, item.size);
  const urls = new Set(item.urls);
  const group = result.groups.find(g => g.offers.some(o => urls.has(o.url)));
  const best = group?.best;
  return {
    lastPrice: best?.price ?? null,
    lastStore: best?.storeName,
    lastUrl: best?.url ?? item.lastUrl,
    urls: group ? [...new Set([...item.urls, ...group.offers.map(o => o.url)])] : item.urls,
    checkedAt: new Date().toISOString(),
  };
}

function Change({ item }: { item: SavedItem }) {
  if (item.lastPrice == null || item.savedPrice == null) return null;
  const diff = item.lastPrice - item.savedPrice;
  if (diff === 0) return <span className="text-[13px] text-faint">Same as when saved</span>;
  return diff < 0 ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2 py-0.5 text-[13px] text-rose">
      <ArrowDownRight size={14} /> {money(-diff)} cheaper than when saved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[13px] text-faint">
      <ArrowUpRight size={14} /> {money(diff)} more than when saved
    </span>
  );
}

export function SavedList({ kind }: { kind: Kind }) {
  const { items, remove, update } = useSaved(kind);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const started = useRef(false);

  // Once per visit, refresh anything not checked in the last ten minutes.
  useEffect(() => {
    if (started.current || !items.length) return;
    started.current = true;
    const due = items.filter(i => Date.now() - Date.parse(i.checkedAt) > STALE_MS).slice(0, MAX_AUTO_CHECKS);
    setChecking(new Set(due.map(i => i.id)));
    due.forEach(async item => {
      try {
        update(item.id, await recheck(item));
      } catch {
        /* keep the last known price */
      } finally {
        setChecking(s => {
          const next = new Set(s);
          next.delete(item.id);
          return next;
        });
      }
    });
  }, [items, update]);

  if (!items.length) return null;

  return (
    <section className="mt-12" aria-labelledby={`saved-${kind}`}>
      <h2 id={`saved-${kind}`} className="font-heading text-[20px] font-medium">
        Saved <span className="tabular font-mono text-[15px] text-faint">{items.length}</span>
      </h2>
      <p className="mt-1 text-[14px] text-muted">Prices update each time you open Dropwatch. Saved on this device only.</p>
      <ul className="mt-4 grid gap-3 p-0 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: LIFT }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              className="flex list-none gap-3 rounded-card bg-surface p-3 shadow-card ring-1 ring-line/60"
            >
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#F6F2EC]">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1.5 mix-blend-multiply" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <p className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug text-ink">
                    {item.title}
                    {item.size && <span className="text-faint"> · UK {item.size}</span>}
                  </p>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="-mt-1 -mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-faint hover:text-ink"
                  >
                    <X size={17} />
                  </button>
                </div>
                {checking.has(item.id) ? (
                  <div className="shimmer mt-1 h-5 w-32 rounded-full" aria-label="Checking price" />
                ) : item.lastPrice != null ? (
                  <p className="mt-0.5 text-[14px] text-muted">
                    <span className="tabular font-mono text-[17px] text-ink">{money(item.lastPrice)}</span> at {item.lastStore}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[14px] text-muted">Not available right now</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Change item={item} />
                  <span className="text-[13px] text-faint">Checked {ago(item.checkedAt)}</span>
                </div>
                {item.lastUrl && item.lastPrice != null && (
                  <PressButton href={item.lastUrl} tone="quiet" className="mt-2">
                    Buy at {item.lastStore} <ArrowUpRight size={16} />
                  </PressButton>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
