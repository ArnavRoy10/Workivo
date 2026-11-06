'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Inbox, Bookmark, MessageSquare, Eye, TrendingUp,
  ArrowRight, Plus, FileText, Users,
} from 'lucide-react';

import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { WorkPost } from '@/lib/types';
import { formatTimeAgo, getWorkTypeLabel } from '@/lib/constants';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ applications: 0, posts: 0, saved: 0, messages: 0, views: 0 });
  const [recentPosts, setRecentPosts] = useState<WorkPost[]>([]);
  const [recommended, setRecommended] = useState<WorkPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [appsRes, postsRes, savedRes, viewsRes] = await Promise.all([
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('applicant_id', user.id),
        supabase.from('work_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('saved_posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('profile_views').eq('user_id', user.id).maybeSingle(),
      ]);

      const { count: msgCount } = await supabase
        .from('conversation_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        applications: appsRes.count || 0,
        posts: postsRes.count || 0,
        saved: savedRes.count || 0,
        messages: msgCount || 0,
        views: (viewsRes.data as { profile_views: number } | null)?.profile_views || 0,
      });

      const { data: myPosts } = await supabase
        .from('work_posts')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentPosts((myPosts as WorkPost[]) || []);

      const { data: recs } = await supabase
        .from('work_posts')
        .select('*, category:categories(*), profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location), skills:work_post_skills(skill)')
        .eq('type', 'looking_for_people')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      const mappedRecs = (recs || []).map(p => ({
        ...p,
        skills: (p.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
      })) as WorkPost[];
      setRecommended(mappedRecs);
      setLoading(false);
    })();
  }, [user]);

  const statCards = [
    { label: 'Applications', value: stats.applications, icon: Inbox, href: '/applications', color: 'text-blue-500' },
    { label: 'Active Posts', value: stats.posts, icon: FileText, href: '/dashboard/posts', color: 'text-green-500' },
    { label: 'Saved', value: stats.saved, icon: Bookmark, href: '/saved', color: 'text-orange-500' },
    { label: 'Profile Views', value: stats.views, icon: Eye, href: `/profile/${profile?.id || ''}`, color: 'text-purple-500' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, href: '/messages', color: 'text-cyan-500' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome back, {profile?.display_name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening on your Workivo account.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {statCards.map(stat => (
            <Link key={stat.label} href={stat.href}>
              <Card className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button asChild>
            <Link href="/post/create"><Plus className="mr-2 h-4 w-4" /> Create Post</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/find-work"><Briefcase className="mr-2 h-4 w-4" /> Find Work</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/find-people"><Users className="mr-2 h-4 w-4" /> Find People</Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* My Recent Posts */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">My Recent Posts</CardTitle>
              <Link href="/dashboard/posts" className="text-sm text-primary hover:underline flex items-center">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">You haven&apos;t posted yet.</p>
                  <Button size="sm" asChild><Link href="/post/create">Create your first post</Link></Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map(post => (
                    <Link key={post.id} href={`/post/${post.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{getWorkTypeLabel(post.work_type)}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</span>
                          <Badge variant={post.status === 'active' ? 'default' : 'outline'} className="text-xs">{post.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recommended For You</CardTitle>
              <Link href="/find-work" className="text-sm text-primary hover:underline flex items-center">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : recommended.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No recommendations yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommended.map(post => (
                    <Link key={post.id} href={`/post/${post.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-secondary transition-colors">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={post.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{post.profile?.display_name} · {post.location || 'Remote'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{getWorkTypeLabel(post.work_type)}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
