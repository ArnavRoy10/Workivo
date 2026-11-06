'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logAdminAction } from '@/lib/admin';
import type { Category } from '@/lib/types';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function AdminCategoriesPage() {
  const { profile: me, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as Category[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!me?.is_founder) { setLoading(false); return; }
    load();
  }, [authLoading, me?.is_founder]);

  const add = async () => {
    const clean = name.trim();
    const slug = slugify(clean);
    if (!clean || !slug) return;
    setAdding(true);
    const { error } = await supabase.from('categories').insert({ name: clean, slug });
    setAdding(false);
    if (error) { toast.error(error.message.includes('duplicate') ? 'That category already exists.' : error.message); return; }
    logAdminAction('add_category', null, 'category', clean);
    setName('');
    toast.success('Category added');
    load();
  };

  const remove = async (cat: Category) => {
    if (!window.confirm(`Delete the category "${cat.name}"?`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) {
      toast.error(error.message.includes('foreign key') ? 'Posts still use this category, so it cannot be deleted.' : error.message);
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== cat.id));
    logAdminAction('delete_category', cat.id, 'category', cat.name);
    toast.success('Category deleted');
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Categories</h1>
        {authLoading || loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !me?.is_founder ? (
          <p className="text-sm text-muted-foreground">Founder access only.</p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Input placeholder="New category name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
              <Button onClick={add} disabled={adding || !name.trim()}>
                {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <Card key={cat.id} className="glass-card">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.slug}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(cat)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
              {categories.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No categories yet. Add your first one above.</p>}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
