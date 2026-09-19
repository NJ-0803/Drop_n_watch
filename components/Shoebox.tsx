'use client';

import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { LIFT } from './motion';
import { SneakerArt } from './SneakerArt';

const W = 200; // width
const H = 92; // box height
const D = 128; // depth
const LID = 22; // lid height

function Face({ w, h, transform, style, children }: { w: number; h: number; transform: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div
      className="absolute flex items-center justify-center overflow-hidden rounded-[3px]"
      style={{ width: w, height: h, left: -w / 2, top: -h / 2, transform, backfaceVisibility: 'hidden', ...style }}
    >
      {children}
    </div>
  );
}

/** Burgundy card stock, darkened (positive) or lit (negative) per side so the box reads as solid. */
const shade = (amount: number): CSSProperties => {
  const tint = amount >= 0 ? `rgb(0 0 0 / ${amount})` : `rgb(255 255 255 / ${-amount})`;
  return { background: `linear-gradient(${tint}, ${tint}), linear-gradient(160deg, rgb(var(--accent)), rgb(var(--accent-deep)))` };
};

/**
 * A CSS-3D shoebox. Drag to spin it; tap (or Enter) to lift the lid and let
 * the sneaker float out. Idles with a slow turn unless the user prefers
 * reduced motion.
 */
export function Shoebox({ size }: { size?: string }) {
  const reduced = useReducedMotion();
  const rotY = useMotionValue(-28);
  const rotX = useMotionValue(-18);
  const dragging = useRef(false);
  const moved = useRef(0);
  const [open, setOpen] = useState(false);

  useAnimationFrame((_, delta) => {
    if (!reduced && !dragging.current && !open) rotY.set(rotY.get() + delta * 0.012);
  });

  return (
    <div className="relative mx-auto flex h-[250px] w-full max-w-[320px] items-center justify-center" style={{ perspective: 900 }}>
      {/* floor shadow */}
      <div aria-hidden className="absolute bottom-6 h-8 w-56 rounded-[50%] bg-scrim/50 blur-xl" />

      <motion.div
        role="button"
        tabIndex={0}
        aria-pressed={open}
        aria-label={open ? 'Close the shoebox' : 'Open the shoebox'}
        className="preserve-3d relative h-0 w-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ rotateX: rotX, rotateY: rotY, y: 20 }}
        onPanStart={() => {
          dragging.current = true;
          moved.current = 0;
        }}
        onPan={(_, info) => {
          moved.current += Math.abs(info.delta.x) + Math.abs(info.delta.y);
          rotY.set(rotY.get() + info.delta.x * 0.6);
          rotX.set(Math.max(-40, Math.min(-4, rotX.get() - info.delta.y * 0.35)));
        }}
        onPanEnd={() => {
          dragging.current = false;
        }}
        onTap={() => moved.current < 6 && setOpen(o => !o)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen(o => !o))}
      >
        {/* box body */}
        <Face w={W} h={H} transform={`translateZ(${D / 2}px)`} style={shade(0)}>
          <div className="flex w-full items-center justify-between px-4">
            <span className="font-mono text-[11px] tracking-[0.25em] text-accent-ink/90 uppercase">Dropwatch</span>
            <span className="font-serif text-2xl text-accent-ink/90 italic">dw</span>
          </div>
        </Face>
        <Face w={W} h={H} transform={`rotateY(180deg) translateZ(${D / 2}px)`} style={shade(0.35)} />
        <Face w={D} h={H} transform={`rotateY(90deg) translateZ(${W / 2}px)`} style={shade(0.25)}>
          <div className="rounded-md bg-[#F3EEE7] px-3 py-1.5 text-center text-[#231E1A] shadow">
            <div className="font-mono text-[9px] tracking-[0.2em] uppercase">Size</div>
            <div className="font-heading text-lg leading-none font-semibold">UK {size ?? '—'}</div>
          </div>
        </Face>
        <Face w={D} h={H} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} style={shade(0.25)} />
        <Face w={W} h={D} transform={`rotateX(-90deg) translateZ(${H / 2}px)`} style={{ background: 'rgb(var(--accent-deep))' }} />
        {/* inside floor, visible when the lid is up */}
        <Face w={W - 4} h={D - 4} transform={`rotateX(90deg) translateZ(${-H / 2 + 2}px)`} style={{ background: 'rgb(var(--scrim))' }} />

        {/* lid: hinged at the back edge */}
        <motion.div
          className="preserve-3d absolute"
          style={{ transformOrigin: `0px ${-H / 2}px ${-D / 2}px` }}
          animate={open ? { rotateX: 105 } : { rotateX: 0 }}
          transition={LIFT}
        >
          <Face w={W + 8} h={D + 8} transform={`rotateX(90deg) translateZ(${H / 2 + 1}px)`} style={shade(-0.1)}>
            <span className="font-serif text-3xl text-accent-ink/85 italic">dropwatch</span>
          </Face>
          <Face w={W + 8} h={LID} transform={`translateY(${-H / 2 + LID / 2 - 1}px) translateZ(${D / 2 + 4}px)`} style={shade(0.1)} />
          <Face w={W + 8} h={LID} transform={`translateY(${-H / 2 + LID / 2 - 1}px) rotateY(180deg) translateZ(${D / 2 + 4}px)`} style={shade(0.4)} />
          <Face w={D + 8} h={LID} transform={`translateY(${-H / 2 + LID / 2 - 1}px) rotateY(90deg) translateZ(${W / 2 + 4}px)`} style={shade(0.3)} />
          <Face w={D + 8} h={LID} transform={`translateY(${-H / 2 + LID / 2 - 1}px) rotateY(-90deg) translateZ(${W / 2 + 4}px)`} style={shade(0.3)} />
        </motion.div>
      </motion.div>

      {/* the sneaker rises out of the open box */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-none absolute top-2 w-52 text-rose"
            initial={{ opacity: 0, y: 60, scale: 0.7, rotate: -6 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: -4, transition: { ...LIFT, delay: 0.12 } }}
            exit={{ opacity: 0, y: 50, scale: 0.8, transition: { duration: 0.2 } }}
          >
            <motion.div animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}>
              <SneakerArt />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
