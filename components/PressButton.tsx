'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { PRESS } from './motion';

type Common = { children: ReactNode; tone?: 'primary' | 'quiet'; size?: 'md' | 'lg'; className?: string; ariaLabel?: string };
type AsLink = Common & { href: string; onClick?: never; type?: never; disabled?: never };
type AsButton = Common & { href?: never; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean };

/**
 * A physical key: the face sits on a darker base and sinks into it when
 * pressed, with a ripple from the touch point. Links open in a new tab.
 */
export function PressButton(props: AsLink | AsButton) {
  const { children, tone = 'primary', size = 'md', className = '', ariaLabel } = props;
  const reduced = useReducedMotion();
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; d: number }[]>([]);
  const nextId = useRef(0);

  const spawn = (e: PointerEvent<HTMLElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const id = nextId.current++;
    setRipples(list => [...list, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }]);
    setTimeout(() => setRipples(list => list.filter(x => x.id !== id)), 560);
  };

  const depth = size === 'lg' ? 6 : 4;
  const face =
    tone === 'primary'
      ? 'bg-accent text-accent-ink'
      : 'bg-surface2 text-ink ring-1 ring-inset ring-control';
  const base = tone === 'primary' ? 'bg-accent-deep' : 'bg-line';
  const pad = size === 'lg' ? 'min-h-14 px-6 text-[17px]' : 'min-h-11 px-5 text-[15px]';

  const inner = (
    <>
      <span aria-hidden className={`absolute inset-0 rounded-2xl ${base}`} style={{ transform: `translateY(${depth}px)` }} />
      <motion.span
        variants={{ rest: { y: 0 }, hover: { y: reduced ? 0 : -1.5 }, press: { y: reduced ? 0 : depth - 1 } }}
        transition={PRESS}
        className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl font-medium ${face} ${pad}`}
      >
        {tone === 'primary' && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        )}
        {ripples.map(r => (
          <span key={r.id} className="ripple" style={{ left: r.x, top: r.y, width: r.d, height: r.d }} />
        ))}
        <span className="relative flex items-center gap-2">{children}</span>
      </motion.span>
    </>
  );

  const shared = {
    initial: 'rest',
    animate: 'rest',
    whileHover: 'hover',
    whileTap: 'press',
    onPointerDown: spawn,
    'aria-label': ariaLabel,
    className: `relative inline-flex select-none disabled:opacity-50 ${className}`,
    style: { paddingBottom: depth },
  } as const;

  if (props.href) {
    return (
      <motion.a {...shared} href={props.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </motion.a>
    );
  }
  return (
    <motion.button {...shared} type={props.type ?? 'button'} onClick={props.onClick} disabled={props.disabled}>
      {inner}
    </motion.button>
  );
}
