'use client';

import type React from 'react';
import { cn } from '@/lib/utils';
import { overrideToStyle } from '@/lib/site-content';
import { useSiteContent } from '@/components/site-content/provider';

/**
 * Shared logic for any piece of text the founder can change.
 * `id` must be unique and stable (e.g. "home.hero.badge"); `defaultText` is the wording in the code.
 */
export function useEditable(id: string, defaultText: string, multiline = false) {
  const ctx = useSiteContent();
  const override = id ? ctx.get(id) : undefined;
  const text = override?.text != null ? override.text : defaultText;
  const editing = !!id && ctx.editMode;
  const selected = editing && ctx.selected?.id === id;

  const onClickCapture = editing
    ? (e: React.MouseEvent) => {
        // In edit mode a click selects the text instead of following a link or pressing a button.
        e.preventDefault();
        e.stopPropagation();
        ctx.select({ id, defaultText, multiline });
      }
    : undefined;

  const attrs: Record<string, string> = id ? { 'data-wx-id': id } : {};
  if (editing) attrs['data-wx-selected'] = selected ? 'true' : 'false';

  return { text, style: overrideToStyle(override), editing, selected, onClickCapture, attrs };
}

interface EditableProps {
  id: string;
  /** The wording that ships in the code. Must be a plain string. */
  children: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}

/** Renders text that the founder can click and edit in "Edit text" mode. Everyone else just sees the text. */
export function Editable({ id, children, as, className, style, multiline = false }: EditableProps) {
  const e = useEditable(id, children, multiline);
  const Tag = (as ?? 'span') as React.ElementType;
  return (
    <Tag
      className={cn(className, multiline && 'whitespace-pre-line')}
      style={{ ...style, ...e.style }}
      onClickCapture={e.onClickCapture}
      {...e.attrs}
    >
      {e.text === '' && e.editing ? <em className="opacity-50">(empty, click to edit)</em> : e.text}
    </Tag>
  );
}