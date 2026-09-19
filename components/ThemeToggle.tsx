'use client';

import { Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { SOFT } from './motion';

type Theme = 'evening' | 'daylight';
const EVENT = 'dw-theme-change';

// The theme lives on <html data-theme> (set before paint by the layout script),
// so the toggle reads it from there rather than keeping its own copy.
function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('dw-theme', t);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const read = (): Theme => (document.documentElement.dataset.theme === 'daylight' ? 'daylight' : 'evening');

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => 'evening' as Theme);

  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded-full bg-surface2 p-1 ring-1 ring-inset ring-control/60">
      {(
        [
          ['evening', Moon, 'Evening'],
          ['daylight', Sun, 'Daylight'],
        ] as const
      ).map(([t, Icon, label]) => (
        <button
          key={t}
          role="radio"
          aria-checked={theme === t}
          aria-label={label}
          onClick={() => applyTheme(t)}
          className="relative grid h-11 w-11 place-items-center rounded-full text-muted aria-checked:text-accent-ink"
        >
          {theme === t && <motion.span layoutId="theme-pill" transition={SOFT} className="absolute inset-0 rounded-full bg-accent" />}
          <Icon size={17} className="relative" />
        </button>
      ))}
    </div>
  );
}
