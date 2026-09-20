'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { describeLink } from '@/lib/linkParse';
import { RETAIL_STORES } from '@/lib/stores';
import { looksLikeLink, prefetch, useSearch } from '@/lib/useSearch';
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
  ['Type or paste', 'A name like “iPhone 17 256GB”, or a link from Amazon, Flipkart or any store.'],
  ['We check', 'Flipkart, Reliance Digital, Vijay Sales, Snapdeal and more, with knock-offs filtered out.'],
  ['Tap to buy', 'One button that opens the cheapest genuine listing.'],
];

export function EverydayView() {
  const { state, run, runLink } = useSearch('retail');
  const router = useRouter();

  /** Shoe links go straight to the sneaker page (read in the browser); other links get a store-by-store verdict. */
  const submit = (text: string) => {
    if (!looksLikeLink(text)) return run(text);
    try {
      const plan = describeLink(text);
      if (!plan.short && plan.mode === 'sneakers') return router.push(`/sneakers?${new URLSearchParams({ q: plan.query })}`);
    } catch {
      /* the server explains what's wrong with the link */
    }
    runLink(text);
  };
  const current = state.status === 'loading' || state.status === 'error' ? state.query : state.status === 'done' ? state.result.query : undefined;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    const q = params.get('q');
    if (url) runLink(url);
    else if (q) run(q);
  }, [run, runLink]);

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
            Type what you want, or paste a link from any store. Dropwatch checks the others and hands you the cheapest genuine
            listing. No knock-offs, no accessories, no prices to type in.
          </motion.p>
          <motion.div variants={rise} className="mt-6">
            <SearchBox
              placeholder="Type a product, or paste a store link"
              suggestions={SUGGESTIONS}
              initial={current}
              busy={state.status === 'loading'}
              onSearch={submit}
              onPrefetch={q => prefetch('retail', q)}
            />
          </motion.div>
        </motion.section>

        <SearchStatus state={state} kind="retail" stores={RETAIL_STORES} onRetry={() => current && submit(current)} />

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
