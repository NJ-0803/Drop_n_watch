'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { SOFT } from './motion';
import { ThemeToggle } from './ThemeToggle';

const TABS = [
  { href: '/', label: 'Everyday' },
  { href: '/sneakers', label: 'Sneakers' },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-3xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="font-serif text-[28px] leading-none tracking-tight text-ink">
          dropwatch<span className="text-rose">.</span>
        </Link>
        <nav aria-label="Sections" className="ml-auto hidden rounded-full bg-surface2 p-1 ring-1 ring-inset ring-control/60 sm:flex">
          {TABS.map(t => {
            const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="relative flex h-11 items-center rounded-full px-5 text-[15px] font-medium text-muted aria-[current=page]:text-accent-ink"
              >
                {active && <motion.span layoutId="nav-pill" transition={SOFT} className="absolute inset-0 rounded-full bg-accent" />}
                <span className="relative">{t.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto sm:ml-2">
          <ThemeToggle />
        </div>
      </div>
      {/* Phones: the section switch sits under the bar, full width. */}
      <nav aria-label="Sections" className="mx-4 mb-3 flex rounded-full bg-surface2 p-1 ring-1 ring-inset ring-control/60 sm:hidden">
        {TABS.map(t => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-11 flex-1 items-center justify-center rounded-full text-[15px] font-medium text-muted aria-[current=page]:text-accent-ink"
            >
              {active && <motion.span layoutId="nav-pill-m" transition={SOFT} className="absolute inset-0 rounded-full bg-accent" />}
              <span className="relative">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
