'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { SNEAKER_STORES } from '@/lib/stores';
import { SneakerArt } from './SneakerArt';
import { TiltCard } from './TiltCard';

/** The top-of-home doorway to the sneaker page. */
export function SneakerBanner() {
  const reduced = useReducedMotion();
  return (
    <TiltCard className="rounded-card" max={6}>
      <Link
        href="/sneakers"
        className="group relative flex min-h-[132px] items-center overflow-hidden rounded-card bg-gradient-to-br from-accent to-accent-deep p-5 text-accent-ink shadow-float sm:p-6"
      >
        <div className="relative z-10 max-w-[62%]">
          <p className="font-mono text-[12px] tracking-[0.2em] uppercase opacity-90">Tap here for</p>
          <p className="mt-1 font-serif text-[34px] leading-none sm:text-[42px]">Sneaker rates</p>
          <p className="mt-2 text-[14px] leading-snug opacity-90 sm:text-[15px]">
            Your size, {SNEAKER_STORES.length} Indian resellers, cheapest first.
          </p>
        </div>
        <motion.div
          aria-hidden
          className="absolute -right-4 top-1/2 w-[46%] max-w-[260px] text-accent-ink/90 sm:right-10"
          style={{ y: '-50%', rotate: -8 }}
          animate={reduced ? undefined : { y: ['-50%', '-56%', '-50%'], rotate: [-8, -5, -8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SneakerArt />
        </motion.div>
        <span className="absolute right-4 bottom-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-accent-ink text-accent transition-transform group-hover:translate-x-1">
          <ArrowRight size={20} />
        </span>
      </Link>
    </TiltCard>
  );
}
