'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, FileText, Plus, MoreVertical, Trash2, Eye, Briefcase, UserSearch } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { WorkPost } from '@/lib/types';
import { formatTimeAgo, getWorkTypeLabel } from '@/lib/constants';

type Filter = 'all' | 'looking_for_people' | 'looking_for_work';

export default function MyPostsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<WorkPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [toDelete, setToDelete] = useState<WorkPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('work_posts')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPosts((data as WorkPost[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('work_posts').delete().eq('id', toDelete.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    setPosts(prev => prev.filter(p => p.id !== toDelete.id));
    setToDelete(null);
    toast.success('Post deleted');
  };

  const setStatus = async (post: WorkPost, status: 'closed' | 'active') => {
    const { error } = await supabase.from('work_posts').update({ status }).eq('id', post.id);
    if (error) {
      if (error.message.includes('HIRING_LIMIT')) {
        toast.error('Free accounts can have 1 active hiring post.', {
          action: { label: 'Upgrade', onClick: () => router.push('/billing') },
        });
      } else if (error.message.includes('SEEKER_LIMIT')) {
        toast.error('You already have 3 active "looking for work" posts. Close or delete one first.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, status } : p)));
    toast.success(status === 'closed' ? 'Post closed' : 'Post reopened');
  };

  const visible = posts.filter(p => filter === 'all' || p.type === filter);
  const hiringCount = posts.filter(p => p.type === 'looking_for_people').length;
  const seekerCount = posts.filter(p => p.type === 'looking_for_work').length;

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Posts</h1>
            <p className="text-muted-foreground text-sm mt-1">Jobs you&apos;re hiring for and your &quot;looking for work&quot; posts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/post/find-job')}><UserSearch className="mr-2 h-4 w-4" /> Find a job</Button>
            <Button onClick={() => router.push('/post/create')}><Briefcase className="mr-2 h-4 w-4" /> Post a job</Button>
          </div>
        </div>

        {posts.length > 0 && (
          <Tabs value={filter} onValueChange={v => setFilter(v as Filter)} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
              <TabsTrigger value="looking_for_people">Hiring ({hiringCount})</TabsTrigger>
              <TabsTrigger value="looking_for_work">Looking for work ({seekerCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {posts.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">You haven&apos;t created any posts yet.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => router.push('/post/find-job')}><UserSearch className="mr-2 h-4 w-4" /> I&apos;m looking for work</Button>
                <Button onClick={() => router.push('/post/create')}><Plus className="mr-2 h-4 w-4" /> I&apos;m hiring</Button>
              </div>
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing in this list yet.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map(post => (
              <Card key={post.id} className="glass-card">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/post/${post.id}`} className="flex-1 min-w-0">
                      <h3 className="font-medium hover:underline">{post.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{getWorkTypeLabel(post.work_type)}</Badge>
                        <Badge variant={post.type === 'looking_for_work' ? 'outline' : 'default'} className="text-xs">
                          {post.type === 'looking_for_work' ? 'Looking for work' : 'Hiring'}
                        </Badge>
                        <Badge variant={post.status === 'active' ? 'default' : 'outline'} className="text-xs">{post.status}</Badge>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Post actions"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/post/${post.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        {post.status === 'active' ? (
                          <DropdownMenuItem onClick={() => setStatus(post, 'closed')}>Close post</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setStatus(post, 'active')}>Reopen post</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setToDelete(post)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={open => { if (!open && !deleting) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toDelete?.title}&quot; will be removed permanently
              {toDelete?.type === 'looking_for_people' ? ', along with any applications it received' : ''}. This cannot be undone.
              If you just want it hidden for now, use &quot;Close post&quot; instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={e => { e.preventDefault(); confirmDelete(); }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}