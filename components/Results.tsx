'use client';

import { ArrowUpRight, Bookmark, BookmarkCheck, Check, SearchX, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { money } from '@/lib/format';
import { savedId, useSaved, type Kind } from '@/lib/saved';
import { LINK_ONLY, storeSearchUrl } from '@/lib/stores';
import type { OfferGroup, SearchResult } from '@/lib/types';
import { LIFT, riseAt } from './motion';
import { PressButton } from './PressButton';
import { TiltCard } from './TiltCard';

/** Product photos are shot on white, so they sit on an ivory plate in both themes. */
function Photo({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#F6F2EC] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- store CDNs vary; plain img avoids proxying every photo
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2 mix-blend-multiply" />
      ) : (
        <span className="text-[13px] text-[#645A51]">No photo</span>
      )}
    </div>
  );
}

function SaveButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save to watch this price'}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted ring-1 ring-inset ring-control/70 hover:text-ink aria-pressed:bg-accent-dim aria-pressed:text-rose aria-pressed:ring-transparent"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(saved)} initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={LIFT}>
          {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function GroupCard({ group, hero, kind, query, size, index }: { group: OfferGroup; hero: boolean; kind: Kind; query: string; size?: string; index: number }) {
  const { toggle, has } = useSaved(kind);
  const best = group.best;
  // Compare by link: after the trip from server to page, `best` is a separate copy of its offer.
  const others = group.offers.filter(o => o.url !== best?.url);
  const id = savedId(kind, group, size);

  return (
    <motion.li {...riseAt(index)} className="list-none">
      <TiltCard className="rounded-card" max={hero ? 4 : 5}>
        <article className={`rounded-card bg-surface shadow-card ring-1 ring-line/60 ${hero ? 'p-4 sm:p-6' : 'p-4 sm:p-5'}`}>
          {hero && best && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1 font-mono text-[12px] tracking-[0.12em] text-rose uppercase">
              <Check size={13} /> Lowest price {size ? `in UK ${size}` : 'found'}
            </p>
          )}
          <div className={`flex gap-4 ${hero ? 'flex-col sm:flex-row' : ''}`}>
            <Photo src={group.image} alt={group.title} className={hero ? 'aspect-square w-full sm:w-56' : 'h-24 w-24 sm:h-28 sm:w-28'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <h3 className={`min-w-0 flex-1 font-heading font-medium text-ink ${hero ? 'text-[20px] leading-snug' : 'text-[16px] leading-snug'}`}>
                  {group.title}
                </h3>
                <SaveButton saved={has(id)} onToggle={() => toggle(group, query, size)} />
              </div>

              {best ? (
                <>
                  <p className="mt-3 text-[14px] text-muted">
                    Cheapest at <span className="font-medium text-ink">{best.storeName}</span>
                    {best.note && <span className="text-faint"> · {best.note}</span>}
                  </p>
                  <p className={`tabular font-mono font-medium text-ink ${hero ? 'text-[34px]' : 'text-[24px]'} leading-tight`}>
                    {money(best.price)}
                    {best.mrp && best.mrp > best.price && (
                      <span className="ml-2 align-middle text-[14px] text-faint line-through">{money(best.mrp)}</span>
                    )}
                  </p>
                  <PressButton href={best.url} size={hero ? 'lg' : 'md'} className={`mt-3 ${hero ? 'w-full sm:w-auto' : ''}`}>
                    Buy at {best.storeName} <ArrowUpRight size={18} />
                  </PressButton>
                </>
              ) : (
                <p className="mt-3 text-[14px] text-muted">Sold out{size ? ` in UK ${size}` : ''} at every store we checked.</p>
              )}
            </div>
          </div>

          {others.length > 0 && (
            <ul className="mt-4 divide-y divide-line/70 border-t border-line/70">
              {others.map(o => (
                <li key={o.url}>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 items-center gap-3 py-2.5 text-[14px] hover:text-ink"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={o.inStock ? 'text-ink' : 'text-faint'}>{o.storeName}</span>
                      {(o.note || !o.inStock) && (
                        <span className="block text-[13px] text-faint">{o.inStock ? o.note : `Sold out${size ? ` in UK ${size}` : ''}`}</span>
                      )}
                    </span>
                    <span className={`tabular font-mono ${o.inStock ? 'text-ink' : 'text-faint line-through'}`}>{money(o.price)}</span>
                    {best && o.inStock && <span className="tabular w-20 text-right font-mono text-[13px] text-faint">+{money(o.price - best.price)}</span>}
                    <ArrowUpRight size={15} className="shrink-0 text-faint" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>
      </TiltCard>
    </motion.li>
  );
}

function StoreStrip({ result }: { result: SearchResult }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Stores checked">
      {result.pending?.map((name, i) => (
        <li key={name} className="flex h-9 items-center gap-2 rounded-full bg-surface2 px-3 text-[13px] text-muted">
          <motion.span
            className="h-2 w-2 rounded-full bg-rose"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
          />
          {name}
        </li>
      ))}
      {result.stores.map(s =>
        s.ok ? (
          <li key={s.store} className="flex h-9 items-center gap-1.5 rounded-full bg-surface2 px-3 text-[13px] text-muted">
            <Check size={13} className={s.matched ? 'text-rose' : 'text-faint'} />
            {s.storeName}
            <span className="tabular font-mono text-faint">{s.matched}</span>
          </li>
        ) : (
          <li key={s.store}>
            <a
              href={storeSearchUrl(s.store, result.query)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${s.storeName} ${s.error}`}
              className="flex h-9 items-center gap-1.5 rounded-full bg-bad-dim px-3 text-[13px] text-bad hover:underline"
            >
              <TriangleAlert size={13} /> {s.storeName}: search it yourself <ArrowUpRight size={13} />
            </a>
          </li>
        ),
      )}
    </ul>
  );
}

/** Stores that refuse servers, offered as one-tap searches so nothing is missed. */
function AlsoCheck({ query, kind }: { query: string; kind: Kind }) {
  const stores = LINK_ONLY.filter(s => kind === 'retail' || s.forSneakers);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-faint">Also check:</span>
      {stores.map(s => (
        <a
          key={s.store}
          href={storeSearchUrl(s.store, query)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-1 rounded-full px-3 text-[13px] text-muted ring-1 ring-inset ring-control/60 hover:text-ink"
        >
          {s.name} <ArrowUpRight size={13} />
        </a>
      ))}
    </div>
  );
}

export function Results({ result, kind, hideFirst = false }: { result: SearchResult; kind: Kind; hideFirst?: boolean }) {
  const failed = result.stores.filter(s => !s.ok);
  const [hero, ...rest] = result.groups;
  const stillChecking = (result.pending?.length ?? 0) > 0;

  return (
    <section aria-live="polite" className={hideFirst ? 'mt-6' : 'mt-8'}>
      <StoreStrip result={result} />
      <AlsoCheck query={result.query} kind={kind} />
      {failed.length > 0 && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          {failed.map(f => f.storeName).join(' and ')} couldn’t be checked automatically just now, so {failed.length > 1 ? 'they are' : 'it is'} not
          in this comparison. Tap {failed.length > 1 ? 'a red chip' : 'the red chip'} to search there yourself.
        </p>
      )}
      {result.loose && result.groups.length > 0 && (
        <p className="mt-3 text-[14px] text-muted">No exact match. These are the closest we found; check the name before buying.</p>
      )}

      {result.groups.length === 0 && stillChecking ? (
        <p className="mt-5 text-[14px] text-muted">Still checking {result.pending!.join(', ')}…</p>
      ) : result.groups.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-card bg-surface p-8 text-center shadow-card">
          <SearchX className="mx-auto text-faint" size={28} />
          <p className="mt-3 font-heading text-[18px] font-medium">Nothing matched “{result.query}”{result.size ? ` in UK ${result.size}` : ''}.</p>
          <p className="mt-1 text-[14px] text-muted">
            Try fewer words (“Jordan 4” rather than the full colourway){kind === 'sneakers' ? ', or a different size' : ''}.
          </p>
        </motion.div>
      ) : (
        <ul key={`${result.query}:${result.size ?? ''}`} className="mt-5 grid gap-4 p-0">
          <GroupCard group={hero} hero kind={kind} query={result.query} size={result.size} index={0} />
          {rest.length > 0 && (
            <motion.li {...riseAt(1)} className="list-none pt-3">
              <h2 className="font-mono text-[12px] tracking-[0.18em] text-faint uppercase">Other matches · {rest.length}</h2>
            </motion.li>
          )}
          {rest.map((g, i) => (
            <GroupCard key={g.key} group={g} hero={false} kind={kind} query={result.query} size={result.size} index={i + 2} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function LoadingState({ stores, size, link }: { stores: string[]; size?: string; link?: boolean }) {
  return (
    <section className="mt-8" aria-busy="true" aria-live="polite">
      <p className="text-[14px] text-muted">
        {link ? 'Reading your link, then checking' : 'Checking'} {stores.length} stores{size ? ` for UK ${size}` : ''}…
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {stores.map((s, i) => (
          <motion.li
            key={s}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { ...LIFT, delay: i * 0.08 } }}
            className="flex h-9 items-center gap-2 rounded-full bg-surface2 px-3 text-[13px] text-muted"
          >
            <motion.span
              className="h-2 w-2 rounded-full bg-rose"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15 }}
            />
            {s}
          </motion.li>
        ))}
      </ul>
      <div className="mt-5 grid gap-4">
        {[0, 1].map(i => (
          <div key={i} className="flex gap-4 rounded-card bg-surface p-4 shadow-card">
            <div className="shimmer h-28 w-28 rounded-2xl" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="shimmer h-4 w-3/4 rounded-full" />
              <div className="shimmer h-4 w-1/3 rounded-full" />
              <div className="shimmer h-10 w-40 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
