'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { UK_SIZES } from '@/lib/sneakers/sizes';
import { SNEAKER_STORES } from '@/lib/stores';
import { describeLink } from '@/lib/linkParse';
import { looksLikeLink, useSearch } from '@/lib/useSearch';
import { Footer } from './Footer';
import { Header } from './Header';
import { rise, stagger } from './motion';
import { SavedList } from './SavedList';
import { SearchBox } from './SearchBox';
import { SearchStatus } from './SearchStatus';
import { Shoebox } from './Shoebox';
import { SizePicker, type SizePickerHandle } from './SizePicker';

const SUGGESTIONS = ['Dunk Low Panda', 'Jordan 4 Bred Reimagined', 'Samba OG', 'Jordan 1 Low', 'New Balance 550'];

/** The size from the address bar, else the one this device last picked. */
function initialSize(): string | undefined {
  const fromUrl = new URLSearchParams(window.location.search).get('size');
  if (fromUrl && UK_SIZES.includes(fromUrl)) return fromUrl;
  try {
    const s = localStorage.getItem('dw-size');
    return s && UK_SIZES.includes(s) ? s : undefined;
  } catch {
    return undefined;
  }
}
const noSubscribe = () => () => {};
const urlQuery = () => new URLSearchParams(window.location.search).get('q') ?? undefined;

/** A pasted link becomes a sneaker search in the browser when its address names the shoe; short links need the server. */
function planLink(text: string): { query?: string; error?: string } {
  try {
    const plan = describeLink(text);
    return plan.short ? {} : { query: plan.query };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function SneakerView() {
  const { state, run, runLink } = useSearch('sneakers');
  const startSize = useSyncExternalStore(noSubscribe, initialSize, () => undefined);
  const [picked, setPicked] = useState<string>();
  const size = picked ?? startSize;
  const [needSize, setNeedSize] = useState(false);
  const [linkError, setLinkError] = useState<string>();
  const picker = useRef<SizePickerHandle>(null);
  // A search that arrived before a size was chosen (a shared link, a shoe link from the home page) waits here.
  const fromUrl = useSyncExternalStore(noSubscribe, urlQuery, () => undefined);
  const [waiting, setWaiting] = useState<string>();
  const current =
    state.status === 'loading' || state.status === 'error'
      ? state.query
      : state.status === 'done'
        ? state.result.query
        : (waiting ?? fromUrl);

  useEffect(() => {
    const q = urlQuery();
    const s = initialSize();
    if (q && s) run(q, s);
  }, [run]);

  const chooseSize = (s: string) => {
    setPicked(s);
    setNeedSize(false);
    try {
      localStorage.setItem('dw-size', s);
    } catch {}
    // Changing size re-prices the current (or waiting) search straight away.
    if (current) search(current, s);
  };

  const search = (text: string, sz = size) => {
    let q = text;
    if (looksLikeLink(text)) {
      const { query, error } = planLink(text);
      if (error) {
        setLinkError(error);
        return;
      }
      if (!query) {
        // Short share link: the server has to follow it first.
        if (sz) runLink(text, sz);
        else {
          setWaiting(text);
          setNeedSize(true);
          picker.current?.nudge();
        }
        return;
      }
      q = query;
    }
    setLinkError(undefined);
    if (!sz) {
      setWaiting(q);
      setNeedSize(true);
      picker.current?.nudge();
      return;
    }
    setWaiting(undefined);
    run(q, sz);
  };
  // Arrived with a search but no size yet: ask for one straight away.
  const askSize = needSize || (!!fromUrl && !size && state.status === 'idle');

  return (
    <>
      <Header />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
        <motion.section variants={stagger} initial="hidden" animate="show" className="grid items-center gap-2 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <motion.p variants={rise} className="font-mono text-[12px] tracking-[0.2em] text-rose uppercase">
              Sneaker rates
            </motion.p>
            <motion.h1 variants={rise} className="mt-2 font-serif text-[46px] leading-[1.02] tracking-tight sm:text-[60px]">
              Your size. Every reseller. <em className="text-rose">Cheapest first.</em>
            </motion.h1>
            <motion.p variants={rise} className="mt-3 text-[15px] leading-relaxed text-muted">
              {SNEAKER_STORES.join(' · ')}
            </motion.p>
          </div>
          <motion.div variants={rise}>
            <Shoebox size={size} />
            <p className="-mt-2 text-center text-[13px] text-faint">Drag to spin · tap to open</p>
          </motion.div>
        </motion.section>

        <div className="mt-8 grid gap-5">
          <SizePicker ref={picker} value={size} onChange={chooseSize} />
          {askSize && (
            <p role="alert" className="-mt-2 text-[14px] text-bad">
              {current ? `Pick your size to see prices for “${current.length > 60 ? 'your link' : current}”.` : 'Pick your size first: resellers price every size differently.'}
            </p>
          )}
          {linkError && (
            <p role="alert" className="-mt-2 text-[14px] text-bad">
              {linkError}
            </p>
          )}
          <SearchBox placeholder="Which sneaker? e.g. Jordan 4 Bred Reimagined" suggestions={SUGGESTIONS} initial={current} busy={state.status === 'loading'} onSearch={search} />
        </div>

        <SearchStatus state={state} kind="sneakers" stores={SNEAKER_STORES} onRetry={() => current && size && run(current, size)} />
        <SavedList kind="sneakers" />
        <Footer />
      </main>
    </>
  );
}
