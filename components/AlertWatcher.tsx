'use client';

import { ArrowUpRight, BellRing, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chime, notify } from '@/lib/chime';
import { money } from '@/lib/format';
import { recheck } from '@/lib/recheck';
import { readSaved, writeSaved, type SavedItem } from '@/lib/saved';
import { LIFT } from './motion';

const ALERT_EVERY_MS = 5 * 60 * 1000;
const REFRESH_STALE_MS = 10 * 60 * 1000;

type Toast = { id: string; title: string; price: number; store?: string; url?: string };

/**
 * Keeps saved prices fresh while any Dropwatch tab is open: on arrival it
 * refreshes anything older than ten minutes, and every five minutes (and
 * whenever the tab comes back into view) it re-checks items with a sound
 * alert on. A qualifying drop plays a chime, shows a card here, and sends a
 * desktop notification if allowed. Closed tabs can't check or chime.
 */
export function AlertWatcher() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const running = useRef(false);

  const check = useCallback(async (which: (i: SavedItem) => boolean) => {
    if (running.current) return;
    running.current = true;
    try {
      const due = readSaved().filter(which).slice(0, 12);
      for (const item of due) {
        const r = await recheck(item).catch(() => null);
        if (!r) continue;
        // Re-read before writing so edits made meanwhile (a new alert, a removal) survive.
        writeSaved(readSaved().map(i => (i.id === item.id ? { ...i, ...r.patch } : i)));
        if (r.alert && r.patch.lastPrice != null) {
          const title = `${item.title}${item.size ? ` · UK ${item.size}` : ''}`;
          const price = r.patch.lastPrice;
          void chime();
          notify(`Price drop: ${money(price)}`, `${title} at ${r.patch.lastStore}`, item.id);
          setToasts(t => [{ id: `${item.id}:${price}`, title, price, store: r.patch.lastStore, url: r.patch.lastUrl }, ...t].slice(0, 3));
        }
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void check(i => Date.now() - Date.parse(i.checkedAt) > REFRESH_STALE_MS);
    const alertsOn = (i: SavedItem) => !!i.alert;
    const timer = setInterval(() => document.visibilityState === 'visible' && void check(alertsOn), ALERT_EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check(i => alertsOn(i) && Date.now() - Date.parse(i.checkedAt) > ALERT_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  return (
    <div aria-live="assertive" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.9, rotateX: -30 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, transition: LIFT }}
            exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
            style={{ transformPerspective: 800 }}
            className="pointer-events-auto rounded-card bg-accent p-4 text-accent-ink shadow-float"
          >
            <div className="flex items-start gap-3">
              <BellRing size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] tracking-[0.14em] uppercase opacity-85">Price drop</p>
                <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug">{t.title}</p>
                <p className="mt-1 font-mono text-[20px]">
                  {money(t.price)} <span className="font-sans text-[14px] opacity-85">at {t.store}</span>
                </p>
                {t.url && (
                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4">
                    Buy now <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
              <button
                onClick={() => setToasts(list => list.filter(x => x.id !== t.id))}
                aria-label="Dismiss"
                className="-mt-2 -mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
              >
                <X size={17} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
