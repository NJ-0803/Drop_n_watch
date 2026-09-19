'use client';

import { ArrowDownRight, ArrowUpRight, Bell, BellRing, Volume2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { askNotifications, chime, unlockSound } from '@/lib/chime';
import { ago, money } from '@/lib/format';
import { useSaved, type Kind, type SavedItem } from '@/lib/saved';
import { LIFT } from './motion';
import { PressButton } from './PressButton';

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

/** Bell toggle plus an optional alert price. Turning it on is the tap that unlocks sound. */
function AlertControl({ item, onChange }: { item: SavedItem; onChange: (patch: Partial<SavedItem>) => void }) {
  const [draft, setDraft] = useState(item.target ? String(item.target) : '');
  const on = !!item.alert;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        aria-pressed={on}
        onClick={async () => {
          if (!on) {
            await unlockSound();
            void askNotifications();
          }
          onChange({ alert: !on, alertedPrice: null });
        }}
        className="flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] ring-1 ring-inset ring-control/70 aria-pressed:bg-accent aria-pressed:text-accent-ink aria-pressed:ring-transparent"
      >
        <motion.span animate={on ? { rotate: [0, -18, 14, -8, 0] } : { rotate: 0 }} transition={{ duration: 0.6 }}>
          {on ? <BellRing size={16} /> : <Bell size={16} />}
        </motion.span>
        {on ? 'Sound alert on' : 'Sound alert'}
      </motion.button>
      {on && (
        <label className="flex min-h-11 items-center gap-2 rounded-full bg-surface2 px-4 text-[14px] text-muted ring-1 ring-inset ring-control/60">
          <span>At or below ₹</span>
          <input
            inputMode="numeric"
            value={draft}
            placeholder="any new low"
            onChange={e => setDraft(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => onChange({ target: draft ? Number(draft) : null, alertedPrice: null })}
            className="tabular w-24 bg-transparent font-mono text-ink outline-none placeholder:font-sans placeholder:text-faint"
            aria-label="Alert price in rupees; leave empty for any new low"
          />
        </label>
      )}
    </div>
  );
}

export function SavedList({ kind }: { kind: Kind }) {
  const { items, remove, update } = useSaved(kind);
  const alerts = items.filter(i => i.alert).length;
  if (!items.length) return null;

  return (
    <section className="mt-12" aria-labelledby={`saved-${kind}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`saved-${kind}`} className="font-heading text-[20px] font-medium">
            Saved <span className="tabular font-mono text-[15px] text-faint">{items.length}</span>
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            {alerts > 0
              ? `Sound alerts on for ${alerts} ${alerts === 1 ? 'item' : 'items'}. We re-check every 5 minutes while a Dropwatch tab is open.`
              : 'Prices update each time you open Dropwatch. Turn on a sound alert to hear drops.'}
          </p>
        </div>
        <PressButton tone="quiet" onClick={() => void chime()}>
          <Volume2 size={16} /> Test sound
        </PressButton>
      </div>
      <ul className="mt-4 grid gap-3 p-0 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: LIFT }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
              className={`flex list-none gap-3 rounded-card bg-surface p-3 shadow-card ring-1 ${item.alert ? 'ring-rose/60' : 'ring-line/60'}`}
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
                {item.lastPrice != null ? (
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
                <AlertControl item={item} onChange={patch => update(item.id, patch)} />
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
