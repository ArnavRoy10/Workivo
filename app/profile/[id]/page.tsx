'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MapPin, BadgeCheck, Briefcase, Star, Flag, ArrowLeft, Loader2,
  MessageSquare, Bookmark, Link as LinkIcon, Calendar,
} from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Profile, WorkPost, Review } from '@/lib/types';
import { formatTimeAgo, getWorkTypeLabel, getExperienceLabel, getRemoteTypeLabel, formatPay } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<WorkPost[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const profileId = params.id as string;
    if (profileId === 'me' && myProfile) {
      router.push(`/profile/${myProfile.id}`);
      return;
    }

    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      
      if (!prof) { setLoading(false); return; }
      
      setProfile(prof as Profile);
      setIsOwnProfile(user?.id === (prof as Profile).user_id);

      const [postsRes, reviewsRes] = await Promise.all([
        supabase
          .from('work_posts')
          .select('*, category:categories(*), skills:work_post_skills(skill)')
          .eq('user_id', (prof as Profile).user_id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)')
          .eq('reviewee_id', (prof as Profile).user_id)
          .order('created_at', { ascending: false }),
      ]);

      const mappedPosts = ((postsRes.data || []) as any[]).map(p => ({
        ...p,
        skills: (p.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
      })) as WorkPost[];
      setPosts(mappedPosts);
      setReviews((reviewsRes.data as Review[]) || []);

      if (user && !isOwnProfile) {
        const { data: saved } = await supabase
          .from('saved_profiles')
          .select('id')
          .eq('user_id', user.id)
          .eq('profile_id', profileId)
          .maybeSingle();
        setIsSaved(!!saved);
      }

      setLoading(false);
    })();
  }, [params.id, user, myProfile, router, isOwnProfile]);

  const handleSave = async () => {
    if (!user) { router.push('/login'); return; }
    if (!profile) return;
    if (isSaved) {
      await supabase.from('saved_profiles').delete().eq('user_id', user.id).eq('profile_id', profile.id);
      setIsSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_profiles').insert({ user_id: user.id, profile_id: profile.id });
      setIsSaved(true);
      toast.success('Profile saved');
    }
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConvs && myConvs.length > 0) {
      for (const mc of myConvs) {
        const { data: other } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', mc.conversation_id)
          .neq('user_id', user.id);
        if (other && other.some(o => o.user_id === profile.user_id)) {
          router.push('/messages');
          return;
        }
      }
    }

    const { data: conv } = await supabase.from('conversations').insert({}).select('id').single();
    if (!conv) { toast.error('Could not start conversation'); return; }

    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: profile.user_id },
    ]);

    toast.success('Conversation started');
    router.push('/messages');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Profile not found.</p>
          <Button onClick={() => router.push('/find-people')}>Browse People</Button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {/* Profile Header */}
        <Card className="glass-card mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-3xl">{profile.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  {profile.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                  {profile.is_minor && <Badge variant="outline" className="text-xs">Under 18</Badge>}
                </div>
                {profile.headline && <p className="text-muted-foreground mt-1">{profile.headline}</p>}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-sm text-muted-foreground">
                  {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}
                  {avgRating && <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-500 fill-amber-500" />{avgRating} ({reviews.length})</span>}
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  {isOwnProfile ? (
                    <Button onClick={() => router.push('/settings')}><Briefcase className="mr-2 h-4 w-4" /> Edit Profile</Button>
                  ) : (
                    <>
                      <Button onClick={handleMessage}><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                      <Button variant="outline" onClick={handleSave}>
                        <Bookmark className={cn('mr-2 h-4 w-4', isSaved && 'fill-primary text-primary')} />
                        {isSaved ? 'Saved' : 'Save'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="about">
          <TabsList className="mb-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-4">
            {profile.bio && (
              <Card className="glass-card">
                <CardHeader><h3 className="font-semibold">About</h3></CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{profile.bio}</p></CardContent>
              </Card>
            )}
            {profile.skills && profile.skills.length > 0 && (
              <Card className="glass-card">
                <CardHeader><h3 className="font-semibold">Skills</h3></CardHeader>
                <CardContent><div className="flex flex-wrap gap-2">{profile.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div></CardContent>
              </Card>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {profile.education && (
                <Card className="glass-card">
                  <CardHeader><h3 className="font-semibold text-sm">Education</h3></CardHeader>
                  <CardContent><p className="text-sm">{profile.education}</p></CardContent>
                </Card>
              )}
              {profile.experience && (
                <Card className="glass-card">
                  <CardHeader><h3 className="font-semibold text-sm">Experience</h3></CardHeader>
                  <CardContent><p className="text-sm whitespace-pre-wrap">{profile.experience}</p></CardContent>
                </Card>
              )}
              <Card className="glass-card">
                <CardHeader><h3 className="font-semibold text-sm">Experience Level</h3></CardHeader>
                <CardContent><p className="text-sm">{getExperienceLabel(profile.experience_level)}</p></CardContent>
              </Card>
              {profile.portfolio_url && (
                <Card className="glass-card">
                  <CardHeader><h3 className="font-semibold text-sm">Portfolio</h3></CardHeader>
                  <CardContent>
                    <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <LinkIcon className="h-4 w-4" /> View Portfolio
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="space-y-3">
            {posts.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No posts yet.</p></CardContent></Card>
            ) : (
              posts.map(post => (
                <Link key={post.id} href={`/post/${post.id}`}>
                  <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{post.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">{getWorkTypeLabel(post.work_type)}</Badge>
                            <Badge variant="outline" className="text-xs">{getRemoteTypeLabel(post.remote_type)}</Badge>
                            {post.pay_amount && <Badge variant="outline" className="text-xs">{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</Badge>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3">
            {reviews.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Star className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No reviews yet.</p></CardContent></Card>
            ) : (
              reviews.map(review => (
                <Card key={review.id} className="glass-card">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(review.reviewer as { avatar_url?: string } | null)?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(review.reviewer as { display_name?: string } | null)?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{(review.reviewer as { display_name?: string } | null)?.display_name || 'Anonymous'}</span>
                      <div className="flex items-center gap-0.5 ml-1">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('h-3.5 w-3.5', i <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />)}
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto">{formatTimeAgo(review.created_at)}</span>
                    </div>
                    <p className="text-sm">{review.body}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
