'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check, Italic, Loader2, Pencil, RotateCcw, Underline, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { HIGHLIGHT_COLORS, SIZE_OPTIONS, TEXT_COLORS } from '@/lib/site-content';
import { useSiteContent } from '@/components/site-content/provider';

function Swatches({ colors, value, onPick, label }: { colors: string[]; value?: string | null; onPick: (c: string | null) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPick(null)}
          className={cn('flex h-6 items-center rounded-full border px-2 text-[11px]', !value && 'border-primary bg-primary/10 text-primary')}
        >
          Auto
        </button>
        {colors.map(c => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            onClick={() => onPick(c)}
            style={{ backgroundColor: c }}
            className={cn('h-6 w-6 rounded-full border border-black/15 transition-transform hover:scale-110', value?.toLowerCase() === c && 'ring-2 ring-primary ring-offset-1')}
          />
        ))}
        <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed" title="Pick any colour">
          <input type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#0ea5e9'} onChange={e => onPick(e.target.value)} className="absolute -inset-2 h-10 w-10 cursor-pointer opacity-0" />
          <span className="flex h-full w-full items-center justify-center bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />
        </label>
      </div>
    </div>
  );
}

/** Everything the founder sees while editing: the "Edit text" button, the bottom bar, and the side panel. */
export function EditBar() {
  const ctx = useSiteContent();
  const pathname = usePathname();
  const [hasEditables, setHasEditables] = useState(false);

  // Only offer the button on pages that actually have editable text.
  useEffect(() => {
    if (!ctx.canEdit) return;
    setHasEditables(false);
    const check = () => setHasEditables(!!document.querySelector('[data-wx-id]'));
    const t1 = setTimeout(check, 400);
    const t2 = setTimeout(check, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [ctx.canEdit, pathname]);

  useEffect(() => {
    if (!ctx.editMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ctx.select(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx]);

  if (!ctx.canEdit) return null;

  if (!ctx.editMode) {
    if (!hasEditables) return null;
    return (
      <button
        type="button"
        onClick={() => ctx.setEditMode(true)}
        className="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full gradient-bg px-4 py-2.5 text-sm font-medium text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105"
      >
        <Pencil className="h-4 w-4" /> Edit text
      </button>
    );
  }

  const sel = ctx.selected;
  const o = (sel && ctx.get(sel.id)) || {};
  const text = o.text ?? sel?.defaultText ?? '';

  const done = () => {
    if (ctx.dirtyCount > 0 && !window.confirm('You have unsaved changes. Leave edit mode and discard them?')) return;
    ctx.discardAll();
    ctx.setEditMode(false);
  };

  return (
    <>
      {sel && (
        <div
          data-lenis-prevent
          className="fixed bottom-20 right-4 z-[70] max-h-[65vh] w-[min(360px,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-2xl border bg-card p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Edit text</p>
              <p className="font-mono text-[10px] text-muted-foreground">{sel.id}</p>
            </div>
            <button type="button" aria-label="Close" onClick={() => ctx.select(null)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
          </div>

          <Textarea
            value={text}
            rows={sel.multiline ? 5 : 3}
            maxLength={2000}
            onChange={e => ctx.update(sel, { text: sel.multiline ? e.target.value : e.target.value.replace(/\r?\n/g, ' ') })}
            className="text-sm"
            autoFocus
          />

          <Swatches label="Text colour" colors={TEXT_COLORS} value={o.color} onPick={c => ctx.update(sel, { color: c })} />
          <Swatches label="Highlight" colors={HIGHLIGHT_COLORS} value={o.bg} onPick={c => ctx.update(sel, { bg: c })} />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-muted-foreground">
              Size
              <select
                value={o.size ?? ''}
                onChange={e => ctx.update(sel, { size: e.target.value || null })}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Auto</option>
                {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Weight
              <select
                value={o.weight ?? ''}
                onChange={e => ctx.update(sel, { weight: e.target.value || null })}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground"
              >
                <option value="">Auto</option>
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant={o.italic ? 'default' : 'outline'} onClick={() => ctx.update(sel, { italic: o.italic === true ? null : true })} aria-pressed={o.italic === true}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant={o.underline ? 'default' : 'outline'} onClick={() => ctx.update(sel, { underline: o.underline === true ? null : true })} aria-pressed={o.underline === true}>
              <Underline className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => ctx.reset(sel)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Back to original
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Changes show on the page straight away. Press Save all to make them live for everyone.</p>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border bg-card px-3 py-2 shadow-2xl">
        <span className="flex items-center gap-1.5 text-sm font-medium"><Pencil className="h-4 w-4 text-primary" /> Editing text</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">Click any outlined text</span>
        {ctx.dirtyCount > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{ctx.dirtyCount} unsaved</span>}
        <Button size="sm" onClick={ctx.saveAll} disabled={ctx.saving || ctx.dirtyCount === 0}>
          {ctx.saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />} Save all
        </Button>
        {ctx.dirtyCount > 0 && <Button size="sm" variant="ghost" onClick={ctx.discardAll} disabled={ctx.saving}>Discard</Button>}
        <Button size="sm" variant="outline" onClick={done}>Done</Button>
      </div>
    </>
  );
}