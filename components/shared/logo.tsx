'use client';

import Link from 'next/link';
import { useId } from 'react';
import { cn } from '@/lib/utils';

type LogoSize = 'sm' | 'default' | 'lg';

export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#14b89a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <path
        d="M7.5 10.5 L11.75 21.5 L16 13.5 L20.25 21.5 L24.5 10.5"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8.25" r="1.75" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

export function Logo({ className, size = 'default' }: { className?: string; size?: LogoSize }) {
  const markSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <Link
      href="/"
      aria-label="Workivo home"
      className={cn('flex items-center gap-2.5 font-bold tracking-tight', className)}
    >
      <LogoMark className={cn(markSize, 'shrink-0 drop-shadow-sm')} />
      <span className={cn(textSize, 'leading-none')}>
        Work<span className="gradient-text">ivo</span>
      </span>
    </Link>
  );
}
