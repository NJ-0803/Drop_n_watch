'use client';

import { ArrowUpRight, BadgeCheck, CircleHelp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { money } from '@/lib/format';
import type { LinkInfo } from '@/lib/useSearch';
import { LIFT } from './motion';
import { PressButton } from './PressButton';

/** The answer to "is the link I pasted the cheapest place to buy this?" */
export function LinkVerdict({ link }: { link: LinkInfo }) {
  const { source, verdict } = link;
  const tone =
    verdict.kind === 'cheaper' ? 'bg-accent text-accent-ink' : verdict.kind === 'cheapest' ? 'bg-surface ring-2 ring-rose' : 'bg-surface';

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, transition: LIFT }} className={`mt-8 rounded-card p-5 shadow-float sm:p-6 ${tone}`}>
      <p className="font-mono text-[12px] tracking-[0.16em] uppercase opacity-80">Your {source.storeName} link</p>
      <p className="mt-1 line-clamp-2 font-heading text-[18px] leading-snug font-medium">{source.title}</p>
      {source.price != null && (
        <p className="mt-1 text-[15px] opacity-85">
          {source.storeName} price: <span className="tabular font-mono">{money(source.price)}</span>
        </p>
      )}

      {verdict.kind === 'cheaper' && (
        <>
          <p className="mt-4 flex items-center gap-2 font-serif text-[30px] leading-tight sm:text-[36px]">
            <TrendingDown size={28} /> {money(verdict.saving)} cheaper at {verdict.best.storeName}
          </p>
          <PressButton href={verdict.best.url} tone="quiet" size="lg" className="mt-4">
            Buy at {verdict.best.storeName} for {money(verdict.best.price)} <ArrowUpRight size={18} />
          </PressButton>
        </>
      )}
      {verdict.kind === 'cheapest' && (
        <p className="mt-4 flex items-center gap-2 font-serif text-[28px] leading-tight text-rose sm:text-[34px]">
          <BadgeCheck size={26} /> You already have the lowest price.
        </p>
      )}
      {verdict.kind === 'unknown' && (
        <>
          <p className="mt-4 flex items-start gap-2 text-[15px] leading-relaxed text-muted">
            <CircleHelp size={18} className="mt-0.5 shrink-0" />
            We couldn’t read {source.storeName}’s price just now. Compare it with the lowest we found elsewhere:
          </p>
          <p className="mt-2 font-serif text-[30px] leading-tight">
            {money(verdict.best.price)} at {verdict.best.storeName}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <PressButton href={verdict.best.url} size="lg">
              Buy at {verdict.best.storeName} <ArrowUpRight size={18} />
            </PressButton>
            <PressButton href={source.url} tone="quiet" size="lg">
              Check {source.storeName}’s price <ArrowUpRight size={18} />
            </PressButton>
          </div>
        </>
      )}
      {verdict.kind === 'none' && (
        <p className="mt-4 text-[15px] text-muted">We couldn’t find this product at the other stores we check.</p>
      )}
    </motion.div>
  );
}
