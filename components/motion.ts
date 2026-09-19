// Shared motion language (Bhookmark): a lift spring with a small overshoot that
// settles in ~350–450ms, then everything goes still so content can be read.
export const LIFT = { type: 'spring', stiffness: 360, damping: 24, mass: 0.9 } as const;
export const SOFT = { type: 'spring', stiffness: 200, damping: 26 } as const;
export const PRESS = { type: 'spring', stiffness: 700, damping: 30 } as const;

export const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: LIFT },
};

export const stagger = { show: { transition: { staggerChildren: 0.06 } } };

/** Self-contained entrance for list items: each one starts itself, delayed by its index. */
export const riseAt = (i: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { ...LIFT, delay: Math.min(i, 8) * 0.06 } },
});
