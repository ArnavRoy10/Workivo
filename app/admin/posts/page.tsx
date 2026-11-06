'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trash2, Eye, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logAdminAction } from '@/lib/admin';
import type { WorkPost } from '@/lib/types';
import { formatTimeAgo, getWorkTypeLabel } from '@/lib/constants';

export default function AdminPostsPage() {
  const { profile: me } = useAuth();
  const isFounder = !!me?.is_founder;
  const [posts, setPosts] = useState<WorkPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('work_posts')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts((data as WorkPost[]) || []);
      setLoading(false);
    })();
  }, []);

  const setStatus = async (post: WorkPost, status: 'removed' | 'active') => {
    const { error } = await supabase.from('work_posts').update({ status }).eq('id', post.id);
    if (error) { toast.error(error.message); return; }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status } : p));
    logAdminAction(status === 'removed' ? 'remove_post' : 'restore_post', post.id, 'post', post.title);
    toast.success(status === 'removed' ? 'Post removed' : 'Post restored');
  };

  const deleteForever = async (post: WorkPost) => {
    if (!window.confirm(`Permanently delete "${post.title}"? Its applications are deleted with it. This cannot be undone.`)) return;
    const { error } = await supabase.from('work_posts').delete().eq('id', post.id);
    if (error) { toast.error(error.message); return; }
    setPosts(prev => prev.filter(p => p.id !== post.id));
    logAdminAction('delete_post', post.id, 'post', post.title);
    toast.success('Post deleted permanently');
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Post Moderation</h1>
        <div className="space-y-2">
          {posts.map(post => (
            <Card key={post.id} className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/post/${post.id}`} className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm hover:underline">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{getWorkTypeLabel(post.work_type)}</Badge>
                      <Badge variant={post.status === 'active' ? 'default' : 'outline'} className="text-xs">{post.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{post.description}</p>
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/post/${post.id}`}><Eye className="h-4 w-4" /></Link></Button>
                    {post.status === 'active' ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Remove (can be restored)" onClick={() => setStatus(post, 'removed')}><XCircle className="h-4 w-4" /></Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setStatus(post, 'active')}>Restore</Button>
                    )}
                    {isFounder && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete permanently" onClick={() => deleteForever(post)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No posts yet.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
