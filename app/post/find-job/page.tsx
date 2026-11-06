'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, MapPin, BadgeCheck, Filter, X, Users, Clock, TrendingUp, UserSearch, Plus } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase/client';
import type { Profile, WorkPost } from '@/lib/types';
import { WORK_TYPES, formatPay, formatTimeAgo, getWorkTypeLabel, getRemoteTypeLabel } from '@/lib/constants';

type View = 'available' | 'members';

const EMPTY_FILTERS = { skill: '', workType: 'all', location: '', experience: 'all' };

// Characters that have a special meaning inside a PostgREST .or() filter
const cleanKeyword = (value: string) => value.trim().replace(/[,()%*\\]/g, ' ');

export default function FindPeoplePage() {
  const [view, setView] = useState<View>('available');
  const [seekers, setSeekers] = useState<WorkPost[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const fetchSeekers = useCallback(async () => {
    let query = supabase
      .from('work_posts')
      .select('*, profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location, headline), skills:work_post_skills(skill)')
      .eq('type', 'looking_for_work')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24);

    const kw = cleanKeyword(keyword);
    if (kw) query = query.or(`title.ilike.%${kw}%,description.ilike.%${kw}%`);
    if (filters.location.trim()) query = query.ilike('location', `%${cleanKeyword(filters.location)}%`);
    if (filters.experience !== 'all') query = query.eq('experience_level', filters.experience);
    if (filters.workType !== 'all') query = query.eq('work_type', filters.workType);

    const { data } = await query;
    let list = ((data || []) as (WorkPost & { skills?: { skill: string }[] | string[] })[]).map(p => ({
      ...p,
      skills: ((p.skills as { skill: string }[] | undefined) || []).map(s => s.skill),
    })) as WorkPost[];

    if (filters.skill.trim()) {
      const needle = filters.skill.trim().toLowerCase();
      list = list.filter(p => p.skills?.some(s => s.toLowerCase().includes(needle)));
    }
    setSeekers(list);
  }, [keyword, filters]);

  const fetchMembers = useCallback(async () => {
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('display_name', '')
      .order('created_at', { ascending: false })
      .limit(24);

    const kw = cleanKeyword(keyword);
    if (kw) query = query.or(`display_name.ilike.%${kw}%,headline.ilike.%${kw}%,bio.ilike.%${kw}%`);
    if (filters.location.trim()) query = query.ilike('location', `%${cleanKeyword(filters.location)}%`);
    if (filters.experience !== 'all') query = query.eq('experience_level', filters.experience);

    const { data } = await query;
    let list = (data as Profile[]) || [];
    if (filters.skill.trim()) {
      const needle = filters.skill.trim().toLowerCase();
      list = list.filter(p => p.skills?.some(s => s.toLowerCase().includes(needle)));
    }
    setMembers(list);
  }, [keyword, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    if (view === 'available') await fetchSeekers();
    else await fetchMembers();
    setLoading(false);
  }, [view, fetchSeekers, fetchMembers]);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setKeyword(''); };

  // Called as a function (not rendered as <FilterContent />) so the inputs keep focus while typing.
  const renderFilters = () => (
    <div className="space-y-4">
      {view === 'available' && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Work type</label>
          <Select value={filters.workType} onValueChange={v => setFilters({ ...filters, workType: v })}>
            <SelectTrigger><SelectValue placeholder="Any type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any type</SelectItem>
              {WORK_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Skill</label>
        <Input placeholder="e.g. React, Design..." value={filters.skill} onChange={e => setFilters({ ...filters, skill: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Experience Level</label>
        <Select value={filters.experience} onValueChange={v => setFilters({ ...filters, experience: v })}>
          <SelectTrigger><SelectValue placeholder="Any level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any level</SelectItem>
            <SelectItem value="entry">Entry Level</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid Level</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="executive">Executive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Location</label>
        <Input placeholder="City or country" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
      </div>
      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" /> Clear all filters
        </Button>
      )}
    </div>
  );

  const count = view === 'available' ? seekers.length : members.length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Find People</h1>
            <p className="text-muted-foreground text-sm">Discover talented people looking for work</p>
          </div>
          <Button asChild>
            <Link href="/post/find-job"><Plus className="mr-2 h-4 w-4" /> I&apos;m looking for work</Link>
          </Button>
        </div>

        <Tabs value={view} onValueChange={v => setView(v as View)} className="mb-5">
          <TabsList>
            <TabsTrigger value="available">Available for work</TabsTrigger>
            <TabsTrigger value="members">All members</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={view === 'available' ? 'Search headlines and descriptions' : 'Search by name, headline, or bio'}
              className="pl-9"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <Button onClick={load}>Search</Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{activeFilterCount}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Filters</h3>
                {renderFilters()}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="glass-card sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Filters</h3>
                {renderFilters()}
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : count === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  {view === 'available' ? <UserSearch className="h-12 w-12 text-muted-foreground mb-3" /> : <Users className="h-12 w-12 text-muted-foreground mb-3" />}
                  <p className="text-muted-foreground mb-1">
                    {view === 'available' ? 'No one is listed as available yet' : 'No people found'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeFilterCount > 0 || keyword ? 'Try adjusting your filters' : view === 'available' ? 'Be the first to post that you are looking for work' : 'Check back soon'}
                  </p>
                  {activeFilterCount > 0 || keyword ? (
                    <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                  ) : view === 'available' ? (
                    <Button asChild><Link href="/post/find-job">I&apos;m looking for work</Link></Button>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {count} {view === 'available' ? (count === 1 ? 'post' : 'posts') : (count === 1 ? 'person' : 'people')} found
                </p>

                {view === 'available' ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {seekers.map(post => (
                      <Link key={post.id} href={`/post/${post.id}`}>
                        <Card className="glass-card h-full hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                          <CardContent className="pt-5">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.profile?.avatar_url || undefined} />
                                <AvatarFallback>{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-sm truncate">{post.profile?.display_name || 'Anonymous'}</span>
                                  {post.profile?.is_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(post.created_at)}</span>
                              </div>
                            </div>
                            <h3 className="font-semibold leading-tight mb-1.5">{post.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.description}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              <Badge variant="secondary" className="text-xs">{getWorkTypeLabel(post.work_type)}</Badge>
                              <Badge variant="outline" className="text-xs">{getRemoteTypeLabel(post.remote_type)}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {post.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{post.location}</span>}
                              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</span>
                            </div>
                            {post.skills && post.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {post.skills.slice(0, 4).map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                                {post.skills.length > 4 && <Badge variant="outline" className="text-xs">+{post.skills.length - 4}</Badge>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map(person => (
                      <Link key={person.id} href={`/profile/${person.id}`}>
                        <Card className="glass-card h-full hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                          <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                              <Avatar className="h-16 w-16 mb-3">
                                <AvatarImage src={person.avatar_url || undefined} />
                                <AvatarFallback className="text-xl">{person.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-1">
                                <h3 className="font-semibold">{person.display_name}</h3>
                                {person.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{person.headline || 'Open to work'}</p>
                              {person.location && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{person.location}</p>}
                              {person.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{person.bio}</p>}
                              {person.skills && person.skills.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-1 mt-3">
                                  {person.skills.slice(0, 4).map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                                  {person.skills.length > 4 && <Badge variant="outline" className="text-xs">+{person.skills.length - 4}</Badge>}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}