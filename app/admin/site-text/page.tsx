'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logAdminAction } from '@/lib/admin';
import { revalidateSiteContent } from '@/lib/site-content';

interface Row {
  key: string;
  text: string | null;
  color: string | null;
  bg: string | null;
  size: string | null;
  weight: string | null;
  italic: boolean | null;
  underline: boolean | null;
  updated_at: string | null;
}

export default function AdminSiteTextPage() {
  const { profile: me, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('site_content').select('*').order('key');
    setRows((data as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!me?.is_founder) { setLoading(false); return; }
    load();
  }, [authLoading, me?.is_founder, load]);

  const remove = async (keys: string[], label: string) => {
    if (!window.confirm(`${label}? The text and look go back to what is in the code.`)) return;
    setBusy(keys.length === 1 ? keys[0] : 'all');
    const { error } = await supabase.from('site_content').delete().in('key', keys);
    if (error) { toast.error(error.message); setBusy(null); return; }
    logAdminAction('reset_site_text', null, 'site_content', keys.length === 1 ? keys[0] : `${keys.length} items`);
    await revalidateSiteContent(session?.access_token);
    setRows(prev => prev.filter(r => !keys.includes(r.key)));
    toast.success('Reset');
    setBusy(null);
  };

  const looks = (r: Row) =>
    [r.color && 'colour', r.bg && 'highlight', r.size && 'size', r.weight && r.weight, r.italic && 'italic', r.underline && 'underline'].filter(Boolean) as string[];

  return (
    <AdminLayout>
      <div className="max-w-4xl p-8">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Page text</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every change made with &quot;Edit text&quot; is listed here. Reset one to bring back the original wording and look.</p>
          </div>
          <Button asChild><Link href="/"><Pencil className="mr-2 h-4 w-4" /> Edit the homepage</Link></Button>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          To edit text, open a page while signed in as founder and press the <strong>Edit text</strong> button at the bottom right. Editable pages: Home, Safety, Login, Sign up, and the footer on every page.
        </p>

        {authLoading || loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !me?.is_founder ? (
          <p className="text-sm text-muted-foreground">Founder access only.</p>
        ) : rows.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-12 text-center text-sm text-muted-foreground">Nothing has been changed yet. Everything shows the original wording.</CardContent></Card>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? 'change' : 'changes'}</p>
              <Button variant="outline" size="sm" onClick={() => remove(rows.map(r => r.key), 'Reset ALL page text')} disabled={busy !== null}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset everything
              </Button>
            </div>
            <div className="space-y-2">
              {rows.map(r => (
                <Card key={r.key} className="glass-card">
                  <CardContent className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-muted-foreground">{r.key}</p>
                      {r.text !== null && <p className="mt-1 truncate text-sm">{r.text === '' ? '(hidden)' : r.text}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {r.color && <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-3 w-3 rounded-full border" style={{ backgroundColor: r.color }} />text</span>}
                        {r.bg && <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-3 w-3 rounded-full border" style={{ backgroundColor: r.bg }} />highlight</span>}
                        {looks(r).filter(l => l !== 'colour' && l !== 'highlight').map(l => <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Reset to original" disabled={busy !== null} onClick={() => remove([r.key], 'Reset this text')}>
                      {busy === r.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}