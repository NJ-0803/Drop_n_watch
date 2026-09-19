'use client';

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';

/**
 * A card that leans toward the pointer in 3D, with a light reflection that
 * appears only while it is being hovered or pressed.
 * On touch it dips toward the finger when pressed and springs back — the
 * "3D click". With reduced motion it is a still card.
 */
export function TiltCard({
  children,
  className = '',
  max = 7,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const reduced = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const pressed = useMotionValue(0);
  const lit = useSpring(0, { stiffness: 200, damping: 30 });
  const spring = { stiffness: 260, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const scale = useSpring(useTransform(pressed, [0, 1], [1, 0.975]), spring);
  const gx = useTransform(px, v => `${v * 100}%`);
  const gy = useTransform(py, v => `${v * 100}%`);
  const light = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgb(255 255 255 / 0.13), transparent 45%)`;

  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const settle = () => {
    px.set(0.5);
    py.set(0.5);
    pressed.set(0);
    lit.set(0);
  };

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div style={{ perspective: 1100 }}>
      <motion.div
        className={`preserve-3d relative ${className}`}
        style={{ rotateX, rotateY, scale }}
        onPointerMove={e => {
          if (e.pointerType !== 'mouse') return;
          aim(e);
          lit.set(1);
        }}
        onPointerDown={e => {
          aim(e);
          pressed.set(1);
          lit.set(1);
        }}
        onPointerUp={e => (e.pointerType === 'mouse' ? pressed.set(0) : settle())}
        onPointerLeave={settle}
        onPointerCancel={settle}
      >
        {children}
        {glare && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: light, opacity: lit }} />}
      </motion.div>
    </div>
  );
}
