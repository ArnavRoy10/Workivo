'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { MotionConfig } from 'framer-motion';

/**
 * Inertia ("buttery") scrolling for the landing page, plus a MotionConfig that makes every
 * framer-motion animation inside respect the visitor's "reduce motion" setting.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
