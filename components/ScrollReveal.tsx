'use client';

import { useEffect, useRef, type CSSProperties, type HTMLAttributes } from 'react';

/** One-time entrance for below-the-fold content; inner 3D transforms stay independent. */
export function ScrollReveal({
  as: Tag = 'div', delay = 0, className = '', children, ...props
}: HTMLAttributes<HTMLElement> & { as?: 'div' | 'li' | 'footer'; delay?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || preference.matches || !('IntersectionObserver' in window)) return;
    // Visible by default, including without JS. Never hide content already on screen.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    const reveal = () => {
      element.dataset.reveal = 'visible';
      observer.disconnect();
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) reveal();
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

    element.dataset.reveal = 'pending';
    observer.observe(element);
    // Keyboard focus must never land on an invisible control.
    element.addEventListener('focusin', reveal);
    preference.addEventListener('change', reveal);
    return () => {
      observer.disconnect();
      element.removeEventListener('focusin', reveal);
      preference.removeEventListener('change', reveal);
      delete element.dataset.reveal;
    };
  }, []);

  return (
    <Tag {...props} ref={(node: HTMLElement | null) => { ref.current = node; }}
      className={`scroll-reveal ${className}`}
      style={{ '--reveal-delay': `${delay}ms`, ...props.style } as CSSProperties}>
      {children}
    </Tag>
  );
}
