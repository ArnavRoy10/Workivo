'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BadgeCheck, MessageSquare, Search, Send, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WordReveal } from '@/components/motion/reveal';
import { Editable } from '@/components/site-content/editable';
import { Magnetic } from '@/components/motion/magnetic';
import { HeroBackdrop } from '@/components/three/hero-backdrop';

export function Hero() {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const chipA = useTransform(scrollYProgress, [0, 1], [0, -260]);
  const chipB = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const chipC = useTransform(scrollYProgress, [0, 1], [0, -340]);
  const hint = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden">
      {/* Backdrop: soft gradient, grid, glow, then the 3D scene on top */}
      <div className="absolute inset-0 gradient-bg-soft" />
      <div className="absolute inset-0 grid-fade opacity-70" />
      <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-emerald-400/10 blur-3xl" />
      <HeroBackdrop progress={scrollYProgress} />
      {/* Keeps the copy readable over the 3D scene on phones */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-background via-background/90 to-transparent md:hidden" />

      {/* Copy */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-4 pb-24 pt-28 sm:px-6 md:justify-center md:pb-16 lg:px-8"
      >
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <Editable id="home.hero.badge">The modern work marketplace</Editable>
          </motion.div>

          <WordReveal
            as="h1"
            delay={0.2}
            className="text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl"
            lines={[
              { text: 'Find Work.', id: 'home.hero.title.1' },
              { text: 'Find People.', id: 'home.hero.title.2' },
              { text: 'Build Opportunities.', className: 'gradient-text', id: 'home.hero.title.3' },
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-6 max-w-xl text-lg text-muted-foreground"
          >
            <Editable id="home.hero.sub" multiline>{"Whether you're looking for your next opportunity or someone to join your team, Workivo helps you connect."}</Editable>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic className="block w-full sm:inline-block sm:w-auto">
              <Button size="lg" className="h-12 w-full px-8 text-base shadow-lg shadow-primary/30 sm:w-auto" onClick={() => router.push('/find-work')}>
                <Search className="mr-2 h-5 w-5" /> <Editable id="home.hero.cta1">Find Work</Editable>
              </Button>
            </Magnetic>
            <Magnetic className="block w-full sm:inline-block sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full bg-card/60 px-8 text-base backdrop-blur sm:w-auto" onClick={() => router.push('/find-people')}>
                <Users className="mr-2 h-5 w-5" /> <Editable id="home.hero.cta2">Find People</Editable>
              </Button>
            </Magnetic>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating UI chips that drift at different speeds as you scroll */}
      <div className="pointer-events-none absolute inset-0 z-10 mx-auto hidden max-w-7xl md:block">
        <motion.div style={{ y: chipA }} className="absolute right-[6%] top-[22%]">
          <div className="float-slow glass-card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl" style={{ ['--tilt' as string]: '-3deg' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg text-white"><Send className="h-4 w-4" /></span>
            <div>
              <Editable as="p" id="home.hero.chip1.title" className="text-sm font-semibold">Application sent</Editable>
              <Editable as="p" id="home.hero.chip1.sub" className="text-xs text-muted-foreground">Just now</Editable>
            </div>
          </div>
        </motion.div>
        <motion.div style={{ y: chipB }} className="absolute right-[1.5%] top-[47%]">
          <div className="float-slower glass-card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl" style={{ ['--tilt' as string]: '2deg' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500"><BadgeCheck className="h-4 w-4" /></span>
            <div>
              <Editable as="p" id="home.hero.chip2.title" className="text-sm font-semibold">Verified profile</Editable>
              <Editable as="p" id="home.hero.chip2.sub" className="text-xs text-muted-foreground">Trusted by employers</Editable>
            </div>
          </div>
        </motion.div>
        <motion.div style={{ y: chipC }} className="absolute right-[27%] top-[83%]">
          <div className="float-slow glass-card flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl" style={{ ['--tilt' as string]: '3deg' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500"><MessageSquare className="h-4 w-4" /></span>
            <div>
              <Editable as="p" id="home.hero.chip3.title" className="text-sm font-semibold">New message</Editable>
              <Editable as="p" id="home.hero.chip3.sub" className="text-xs text-muted-foreground">Say hello</Editable>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div style={{ opacity: hint }} className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-muted-foreground md:flex">
        <Editable id="home.hero.scroll" className="tracking-[0.2em] uppercase">Scroll</Editable>
        <motion.span
          className="block h-10 w-px bg-gradient-to-b from-primary to-transparent"
          animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}