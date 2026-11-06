'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Briefcase, FileText, MessageSquare, Search, UserPlus } from 'lucide-react';
import { TiltCard } from '@/components/motion/tilt-card';
import { Editable } from '@/components/site-content/editable';

const steps = [
  { icon: UserPlus, title: 'Create your profile', desc: "Sign up and tell us about yourself, your skills, and what you're looking for." },
  { icon: Briefcase, title: 'Choose what you want', desc: 'Looking for work? Looking for people? Switch between modes anytime.' },
  { icon: Search, title: 'Discover opportunities', desc: 'Search and filter through real posts and profiles that match your needs.' },
  { icon: FileText, title: 'Apply or connect', desc: 'Submit applications or express interest with a single click.' },
  { icon: MessageSquare, title: 'Start the conversation', desc: 'Message securely within the platform and build connections.' },
];

/**
 * Pinned section: the page stops scrolling vertically while the cards slide sideways,
 * then releases. The section's height is what buys the extra scroll distance.
 */
export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const x = useSpring(useTransform(scrollYProgress, [0, 1], [0, -distance]), { stiffness: 140, damping: 30, mass: 0.4 });
  const barScale = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative bg-card"
      style={{ height: distance > 0 ? `calc(100svh + ${distance}px)` : '320svh' }}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-16">
        <div className="mx-auto mb-10 flex w-full max-w-7xl items-end justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div>
            <Editable as="p" id="home.how.eyebrow" className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-primary">How it works</Editable>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl"><Editable id="home.how.title1">Five steps.</Editable> <Editable id="home.how.title2" className="gradient-text">Zero friction.</Editable></h2>
            <Editable as="p" id="home.how.sub" className="mt-3 max-w-md text-muted-foreground">{"It's free to join and post. Keep scrolling."}</Editable>
          </div>
          <div className="hidden w-48 sm:block">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <motion.div style={{ scaleX: barScale }} className="h-full origin-left gradient-bg" />
            </div>
          </div>
        </div>

        <motion.div ref={trackRef} style={{ x }} className="flex w-max gap-6 pl-[max(1rem,calc((100vw-80rem)/2+2rem))] pr-[12vw] will-change-transform">
          {steps.map((step, i) => (
            <div key={step.title} className="w-[78vw] shrink-0 sm:w-[46vw] lg:w-[30vw] lg:max-w-[460px]">
              <TiltCard className="rounded-3xl" max={8}>
                <div className="relative flex h-[340px] flex-col justify-between overflow-hidden rounded-3xl border bg-background p-7 shadow-xl sm:h-[380px]">
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-400/25 to-emerald-400/25 blur-3xl" aria-hidden />
                  <span className="text-outline pointer-events-none absolute -right-2 -top-6 select-none text-[9rem] font-black leading-none">{i + 1}</span>
                  <div className="relative" style={{ transform: 'translateZ(40px)' }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-bg text-white shadow-lg shadow-primary/30">
                      <step.icon className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="relative" style={{ transform: 'translateZ(25px)' }}>
                    <Editable as="h3" id={`home.how.step${i + 1}.title`} className="mb-2 text-2xl font-bold">{step.title}</Editable>
                    <Editable as="p" multiline id={`home.how.step${i + 1}.desc`} className="text-muted-foreground">{step.desc}</Editable>
                  </div>
                </div>
              </TiltCard>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}