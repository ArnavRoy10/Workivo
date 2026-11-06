'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion, type MotionValue } from 'framer-motion';

// three.js is only downloaded in the browser, and only for the landing page.
const HeroScene = dynamic(() => import('@/components/three/hero-scene'), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('3D scene disabled:', error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Full-bleed 3D background. Falls back to nothing (the CSS gradient behind it stays) when WebGL is
 * unavailable or the scene crashes, pauses rendering while off screen, and holds still for
 * visitors who prefer reduced motion.
 */
export function HeroBackdrop({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [supported, setSupported] = useState(false);
  const [visible, setVisible] = useState(true);
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  useEffect(() => {
    setSupported(webglAvailable());
    const lowPower = window.innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
    setQuality(lowPower ? 'low' : 'high');
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      {supported && (
        <SceneBoundary>
          <HeroScene progress={progress} animate={!reduce && visible} quality={quality} />
        </SceneBoundary>
      )}
    </div>
  );
}
