'use client';

import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEditable } from '@/components/site-content/editable';

const EASE = [0.22, 1, 0.36, 1] as const;

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const offset = (direction: Direction, distance: number) => {
  switch (direction) {
    case 'up': return { y: distance };
    case 'down': return { y: -distance };
    case 'left': return { x: distance };
    case 'right': return { x: -distance };
    default: return {};
  }
};

/** Fades and slides its children in once, when they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  distance = 40,
  blur = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  distance?: number;
  blur?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: blur ? 'blur(8px)' : 'blur(0px)', ...offset(direction, distance) }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
};

const word: Variants = {
  hidden: { y: '115%', rotateX: -60, opacity: 0 },
  show: { y: '0%', rotateX: 0, opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

/** One line of a headline. If it has an `id`, the founder can click it to change the wording and look. */
function RevealLine({ line }: { line: { text: string; className?: string; id?: string } }) {
  const e = useEditable(line.id ?? '', line.text);
  const text = line.id ? e.text : line.text;
  const words: string[] = text.split(' ');
  return (
    <span className="block" onClickCapture={line.id ? e.onClickCapture : undefined} {...(line.id ? e.attrs : {})}>
      {words.map((w: string, wi: number) => (
        <span key={wi} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
          <motion.span
            variants={word}
            style={line.id ? e.style : undefined}
            className={cn('inline-block origin-bottom will-change-transform', line.className)}
          >
            {w}
            {wi < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Headline that rises word by word out of a mask. `lines` lets you style one line differently,
 * e.g. [{ text: 'Find Work.' }, { text: 'Build Opportunities.', className: 'gradient-text' }].
 */
export function WordReveal({
  lines,
  className,
  stagger = 0.07,
  delay = 0,
  once = true,
  as: Tag = 'h2',
}: {
  lines: { text: string; className?: string; id?: string }[];
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
  const MotionTag = motion[Tag];
  return (
    <MotionTag
      className={className}
      variants={container}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-60px' }}
      transition={{ delayChildren: delay }}
      style={{ perspective: 800 }}
    >
      {lines.map((line, li) => (
        <RevealLine key={li} line={line} />
      ))}
    </MotionTag>
  );
}