'use client';

import { motion } from 'motion/react';
import { useEffect } from 'react';
import { RETAIL_STORES } from '@/lib/stores';
import { useSearch } from '@/lib/useSearch';
import { Footer } from './Footer';
import { Header } from './Header';
import { rise, stagger } from './motion';
import { SavedList } from './SavedList';
import { SearchBox } from './SearchBox';
import { SearchStatus } from './SearchStatus';
import { SneakerBanner } from './SneakerBanner';
import { TiltCard } from './TiltCard';

const SUGGESTIONS = ['AirPods Pro 3', 'iPhone 17', 'PS5 Slim', 'Galaxy S25', 'Kindle Paperwhite'];
const STEPS = [
  ['Type it', 'The name is enough: “AirPods Pro 3”, “iPhone 17 256GB”.'],
  ['We check', 'Amazon and Flipkart, with knock-offs and accessories filtered out.'],
  ['Tap to buy', 'One button that opens the cheapest genuine listing.'],
];

export function EverydayView() {
  const { state, run } = useSearch('retail');
  const current = state.status === 'loading' || state.status === 'error' ? state.query : state.status === 'done' ? state.result.query : undefined;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) run(q);
  }, [run]);

  return (
    <>
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pt-5 pb-16 sm:px-6">
        <SneakerBanner />

        <motion.section variants={stagger} initial="hidden" animate="show" className="mt-10">
          <motion.h1 variants={rise} className="font-serif text-[48px] leading-[1.02] tracking-tight sm:text-[68px]">
            Find it <em className="text-rose">cheaper.</em>
          </motion.h1>
          <motion.p variants={rise} className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Type what you want. Dropwatch checks the stores and hands you the cheapest genuine link. No knock-offs, no accessories, no
            prices to type in.
          </motion.p>
          <motion.div variants={rise} className="mt-6">
            <SearchBox
              placeholder="What do you want to buy?"
              suggestions={SUGGESTIONS}
              initial={current}
              busy={state.status === 'loading'}
              onSearch={q => run(q)}
            />
          </motion.div>
        </motion.section>

        <SearchStatus state={state} kind="retail" stores={RETAIL_STORES} onRetry={() => current && run(current)} />

        {state.status === 'idle' && (
          <motion.ol variants={stagger} initial="hidden" animate="show" className="mt-12 grid gap-3 p-0 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <motion.li key={title} variants={rise} className="list-none">
                <TiltCard className="h-full rounded-card" max={8}>
                  <div className="h-full rounded-card bg-surface p-5 shadow-card ring-1 ring-line/60">
                    <span className="font-mono text-[13px] text-rose">0{i + 1}</span>
                    <p className="mt-2 font-heading text-[18px] font-medium">{title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted">{body}</p>
                  </div>
                </TiltCard>
              </motion.li>
            ))}
          </motion.ol>
        )}

        <SavedList kind="retail" />
        <Footer />
      </main>
    </>
  );
}
