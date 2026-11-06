import { cn } from '@/lib/utils';

/** Endlessly scrolling row. Pure CSS (see .marquee-track in globals.css), so it costs no JavaScript. */
export function Marquee({
  items,
  className,
  reverse = false,
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const row = (ariaHidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="flex items-center">
          <span className={className}>{item}</span>
          <span className="mx-6 sm:mx-10 h-2 w-2 rounded-full bg-primary/60" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className={cn('marquee-track flex w-max', reverse && 'marquee-reverse')}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
