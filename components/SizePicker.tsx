'use client';

import { motion, useAnimationControls } from 'motion/react';
import { forwardRef, useImperativeHandle } from 'react';
import { UK_SIZES } from '@/lib/sneakers/sizes';
import { SOFT } from './motion';

export type SizePickerHandle = { nudge: () => void };

/** UK sizes as a scrollable row. `nudge` shakes it when someone searches before choosing. */
export const SizePicker = forwardRef<SizePickerHandle, { value?: string; onChange: (s: string) => void }>(function SizePicker(
  { value, onChange },
  ref,
) {
  const controls = useAnimationControls();
  useImperativeHandle(ref, () => ({ nudge: () => void controls.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.45 } }) }));

  return (
    <motion.fieldset animate={controls} className="min-w-0">
      <legend className="font-mono text-[12px] tracking-[0.18em] text-faint uppercase">Your size · UK</legend>
      <div role="radiogroup" aria-label="UK size" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {UK_SIZES.map(s => (
          <button
            key={s}
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            className="relative grid h-12 min-w-12 shrink-0 place-items-center rounded-2xl bg-surface2 px-3 font-mono text-[15px] text-muted ring-1 ring-inset ring-control/60 aria-checked:text-accent-ink aria-checked:ring-transparent"
          >
            {value === s && <motion.span layoutId="size-pill" transition={SOFT} className="absolute inset-0 rounded-2xl bg-accent shadow-float" />}
            <span className="relative tabular">{s}</span>
          </button>
        ))}
      </div>
    </motion.fieldset>
  );
});
