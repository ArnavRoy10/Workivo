import type { CSSProperties } from 'react';

/** Text sizes the founder can choose. `css` is what actually gets applied (responsive where it matters). */
export const SIZE_OPTIONS = [
  { value: 's', label: 'Small', css: '0.875rem' },
  { value: 'm', label: 'Normal', css: '1rem' },
  { value: 'l', label: 'Large', css: '1.25rem' },
  { value: 'xl', label: 'Extra large', css: '1.75rem' },
  { value: '2xl', label: 'Heading', css: 'clamp(1.75rem, 4vw, 2.5rem)' },
  { value: '3xl', label: 'Big heading', css: 'clamp(2.25rem, 6vw, 3.75rem)' },
  { value: '4xl', label: 'Huge', css: 'clamp(2.75rem, 8vw, 5.5rem)' },
] as const;

export const TEXT_COLORS = ['#0f172a', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b89a', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b'];
export const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#e9d5ff', '#fed7aa', '#0f172a', '#0ea5e9', '#14b89a'];

export interface ContentOverride {
  text?: string | null;
  color?: string | null;
  bg?: string | null;
  size?: string | null;
  weight?: string | null;
  italic?: boolean | null;
  underline?: boolean | null;
}

export type ContentMap = Record<string, ContentOverride>;

export const CONTENT_COLUMNS = 'key,text,color,bg,size,weight,italic,underline';

const COLOR_RE = /^#[0-9a-f]{6}$/i;

/** Turns a stored override into inline styles. Every value is checked again here, whatever the database holds. */
export function overrideToStyle(o?: ContentOverride): CSSProperties {
  if (!o) return {};
  const style: CSSProperties = {};
  if (o.color && COLOR_RE.test(o.color)) {
    style.color = o.color;
    style.backgroundImage = 'none'; // so a chosen colour also replaces gradient text
  }
  if (o.bg && COLOR_RE.test(o.bg)) {
    style.backgroundColor = o.bg;
    style.borderRadius = '0.25em';
    style.padding = '0 0.2em';
    style.boxDecorationBreak = 'clone';
    (style as Record<string, string>).WebkitBoxDecorationBreak = 'clone';
  }
  const size = SIZE_OPTIONS.find(s => s.value === o.size);
  if (size) style.fontSize = size.css;
  if (o.weight === 'bold') style.fontWeight = 700;
  if (o.weight === 'normal') style.fontWeight = 400;
  if (o.italic === true) style.fontStyle = 'italic';
  if (o.italic === false) style.fontStyle = 'normal';
  if (o.underline === true) style.textDecoration = 'underline';
  if (o.underline === false) style.textDecoration = 'none';
  return style;
}

/** True when an override changes nothing compared with the wording and look in the code. */
export function isEmptyOverride(o: ContentOverride | null | undefined, defaultText: string): boolean {
  if (!o) return true;
  const textSame = o.text == null || o.text === defaultText;
  return textSame && !o.color && !o.bg && !o.size && !o.weight && o.italic == null && o.underline == null;
}

export function rowsToMap(rows: unknown): ContentMap {
  const map: ContentMap = {};
  if (!Array.isArray(rows)) return map;
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof (row as { key?: unknown }).key !== 'string') continue;
    const { key, ...rest } = row as { key: string } & ContentOverride;
    map[key] = rest;
  }
  return map;
}

/** Asks the server to refresh its cached copy so every visitor sees a change straight away. */
export async function revalidateSiteContent(accessToken: string | undefined) {
  try {
    await fetch('/api/site-content/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${accessToken || ''}` } });
  } catch {
    // Not critical: the public copy refreshes on its own within a minute.
  }
}