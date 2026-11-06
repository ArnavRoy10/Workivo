'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Bookmark, MapPin, Clock, TrendingUp, BadgeCheck, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { WorkPost, Profile } from '@/lib/types';
import { formatTimeAgo, formatPay, getWorkTypeLabel } from '@/lib/constants';

export default function SavedPage() {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<WorkPost[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sp } = await supabase
        .from('saved_posts')
        .select('post:work_posts(*, category:categories(*), profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location), skills:work_post_skills(skill))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const mappedPosts = ((sp || []) as any[]).map(item => ({
        ...item.post,
        skills: (item.post?.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
      })) as WorkPost[];
      setSavedPosts(mappedPosts);

      const { data: sprof } = await supabase
        .from('saved_profiles')
        .select('profile:profiles(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setSavedProfiles(((sprof || []) as any[]).map(item => item.profile).filter(Boolean) as Profile[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Saved</h1>
        <p className="text-muted-foreground text-sm mb-6">Your saved opportunities and people</p>

        <Tabs defaultValue="jobs">
          <TabsList className="mb-4">
            <TabsTrigger value="jobs">Jobs ({savedPosts.length})</TabsTrigger>
            <TabsTrigger value="people">People ({savedProfiles.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-3">
            {savedPosts.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Bookmark className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No saved jobs yet.</p><Link href="/find-work" className="text-sm text-primary hover:underline mt-2 inline-block">Browse opportunities</Link></CardContent></Card>
            ) : (
              savedPosts.map(post => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{post.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Avatar className="h-5 w-5"><AvatarImage src={post.profile?.avatar_url || undefined} /><AvatarFallback className="text-[10px]">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                            <span className="truncate">{post.profile?.display_name || 'Anonymous'}</span>
                            {post.profile?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                            {post.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{post.location}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(post.created_at)}</span>
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{getWorkTypeLabel(post.work_type)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="people" className="space-y-3">
            {savedProfiles.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No saved profiles yet.</p><Link href="/find-people" className="text-sm text-primary hover:underline mt-2 inline-block">Browse people</Link></CardContent></Card>
            ) : (
              savedProfiles.map(person => (
                <Link key={person.id} href={`/profile/${person.id}`}>
                  <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12"><AvatarImage src={person.avatar_url || undefined} /><AvatarFallback>{person.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="font-medium truncate">{person.display_name}</h3>
                            {person.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{person.headline || 'Open to work'}</p>
                          {person.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{person.location}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
