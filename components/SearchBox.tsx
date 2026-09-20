'use client';

import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { LIFT } from './motion';
import { PressButton } from './PressButton';

export function SearchBox({
  placeholder,
  suggestions,
  initial,
  busy,
  onSearch,
  onPrefetch,
}: {
  placeholder: string;
  suggestions: string[];
  initial?: string;
  busy: boolean;
  onSearch: (q: string) => void;
  /** Warm a suggestion when it's hovered or focused, so the click is instant. */
  onPrefetch?: (q: string) => void;
}) {
  const [q, setQ] = useState(initial ?? '');
  // When a search starts from elsewhere (a chip, the address bar), show its words in the box.
  const [shown, setShown] = useState(initial);
  if (initial !== shown) {
    setShown(initial);
    setQ(initial ?? '');
  }

  const submit = (value: string) => {
    const v = value.trim();
    if (v.length >= 2) onSearch(v);
  };

  return (
    <div>
      <form
        role="search"
        onSubmit={e => {
          e.preventDefault();
          submit(q);
        }}
        className="flex flex-col gap-3 rounded-[26px] bg-surface p-2 shadow-float ring-1 ring-inset ring-control/60 focus-within:ring-2 focus-within:ring-rose sm:flex-row sm:items-center"
      >
        <label className="flex min-h-14 flex-1 items-center gap-3 px-3">
          <Search size={20} className="shrink-0 text-faint" />
          <span className="sr-only">What are you looking for?</span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={placeholder}
            maxLength={80}
            enterKeyHint="search"
            autoComplete="off"
            className="w-full bg-transparent text-[17px] text-ink outline-none placeholder:text-faint"
          />
        </label>
        <PressButton type="submit" size="lg" disabled={busy} className="sm:w-auto">
          {busy ? 'Checking…' : 'Find cheapest'}
        </PressButton>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { ...LIFT, delay: 0.1 + i * 0.05 } }}
            whileTap={{ scale: 0.94 }}
            onPointerEnter={() => onPrefetch?.(s)}
            onFocus={() => onPrefetch?.(s)}
            onClick={() => {
              setQ(s);
              submit(s);
            }}
            className="min-h-11 rounded-full bg-surface2 px-4 text-[14px] text-muted ring-1 ring-inset ring-control/50 hover:text-ink"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
