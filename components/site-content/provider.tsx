'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import {
  CONTENT_COLUMNS, isEmptyOverride, revalidateSiteContent, rowsToMap,
  type ContentMap, type ContentOverride,
} from '@/lib/site-content';

export interface SelectedItem {
  id: string;
  defaultText: string;
  multiline: boolean;
}

interface SiteContentContext {
  canEdit: boolean;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** The override to show for this id: unsaved draft first, then what is saved. */
  get: (id: string) => ContentOverride | undefined;
  selected: SelectedItem | null;
  select: (item: SelectedItem | null) => void;
  update: (item: SelectedItem, patch: Partial<ContentOverride>) => void;
  reset: (item: SelectedItem) => void;
  dirtyCount: number;
  saving: boolean;
  saveAll: () => Promise<void>;
  discardAll: () => void;
}

const noop = () => {};
const INERT: SiteContentContext = {
  canEdit: false, editMode: false, setEditMode: noop, get: () => undefined, selected: null, select: noop,
  update: noop, reset: noop, dirtyCount: 0, saving: false, saveAll: async () => {}, discardAll: noop,
};

const Ctx = createContext<SiteContentContext>(INERT);
export const useSiteContent = () => useContext(Ctx);

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export function SiteContentProvider({ initial, children }: { initial: ContentMap; children: React.ReactNode }) {
  const { profile, session } = useAuth();
  const canEdit = !!profile?.is_founder;

  const [saved, setSaved] = useState<ContentMap>(initial);
  const [drafts, setDrafts] = useState<Record<string, ContentOverride | null>>({});
  const defaultsRef = useRef<Record<string, string>>({});
  const [editMode, setEditModeState] = useState(false);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canEdit) return;
    supabase.from('site_content').select(CONTENT_COLUMNS).limit(2000).then(({ data }) => {
      if (Array.isArray(data)) setSaved(rowsToMap(data));
    });
  }, [canEdit]);

  useEffect(() => {
    if (canEdit && sessionStorage.getItem('wx-edit') === '1') setEditModeState(true);
  }, [canEdit]);

  const active = canEdit && editMode;

  useEffect(() => {
    document.body.classList.toggle('wx-editing', active);
    return () => document.body.classList.remove('wx-editing');
  }, [active]);

  useEffect(() => {
    if (!active || Object.keys(drafts).length === 0) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active, drafts]);

  const setEditMode = useCallback((on: boolean) => {
    setEditModeState(on);
    sessionStorage.setItem('wx-edit', on ? '1' : '0');
    if (!on) setSelected(null);
  }, []);

  const get = useCallback((id: string): ContentOverride | undefined => {
    if (has(drafts, id)) return drafts[id] ?? undefined;
    return saved[id];
  }, [drafts, saved]);

  const update = useCallback((item: SelectedItem, patch: Partial<ContentOverride>) => {
    defaultsRef.current[item.id] = item.defaultText;
    setDrafts(prev => {
      const current = has(prev, item.id) ? prev[item.id] : saved[item.id];
      return { ...prev, [item.id]: { ...(current ?? {}), ...patch } };
    });
  }, [saved]);

  const reset = useCallback((item: SelectedItem) => {
    defaultsRef.current[item.id] = item.defaultText;
    setDrafts(prev => ({ ...prev, [item.id]: null }));
  }, []);

  const discardAll = useCallback(() => setDrafts({}), []);

  const saveAll = useCallback(async () => {
    if (!canEdit || saving) return;
    const toUpsert: Record<string, unknown>[] = [];
    const toDelete: string[] = [];
    const nextSaved: ContentMap = { ...saved };

    for (const [id, draft] of Object.entries(drafts)) {
      const def = defaultsRef.current[id] ?? '';
      if (draft === null || isEmptyOverride(draft, def)) {
        toDelete.push(id);
        delete nextSaved[id];
        continue;
      }
      const row = {
        text: draft.text == null || draft.text === def ? null : draft.text,
        color: draft.color ?? null,
        bg: draft.bg ?? null,
        size: draft.size ?? null,
        weight: draft.weight ?? null,
        italic: draft.italic ?? null,
        underline: draft.underline ?? null,
      };
      toUpsert.push({ key: id, ...row, updated_by: profile?.user_id ?? null });
      nextSaved[id] = row;
    }

    setSaving(true);
    try {
      if (toUpsert.length > 0) {
        const { error } = await supabase.from('site_content').upsert(toUpsert, { onConflict: 'key' });
        if (error) throw new Error(error.message);
      }
      if (toDelete.length > 0) {
        const { error } = await supabase.from('site_content').delete().in('key', toDelete);
        if (error) throw new Error(error.message);
      }
      setSaved(nextSaved);
      setDrafts({});
      await revalidateSiteContent(session?.access_token);
      toast.success('Changes saved. Visitors will see them now.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }, [canEdit, saving, saved, drafts, profile?.user_id, session?.access_token]);

  const value = useMemo<SiteContentContext>(() => ({
    canEdit, editMode: active, setEditMode, get, selected, select: setSelected, update, reset,
    dirtyCount: Object.keys(drafts).length, saving, saveAll, discardAll,
  }), [canEdit, active, setEditMode, get, selected, update, reset, drafts, saving, saveAll, discardAll]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
