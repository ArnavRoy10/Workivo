'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Clock, TrendingUp, BadgeCheck, Filter, X, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase/client';
import type { WorkPost, Category } from '@/lib/types';
import { WORK_TYPES, REMOTE_TYPES, EXPERIENCE_LEVELS, formatTimeAgo, formatPay, getWorkTypeLabel } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function FindWorkPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <FindWorkContent />
    </Suspense>
  );
}

function FindWorkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<WorkPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    workType: 'all',
    remoteType: 'all',
    location: '',
    experience: 'all',
    minPay: '',
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('work_posts')
      .select('*, category:categories(*), profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location), skills:work_post_skills(skill)')
      .eq('type', 'looking_for_people')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24);

    if (keyword.trim()) {
      query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }
    if (filters.category !== 'all') {
      const cat = categories.find(c => c.slug === filters.category);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (filters.workType !== 'all') query = query.eq('work_type', filters.workType);
    if (filters.remoteType !== 'all') query = query.eq('remote_type', filters.remoteType);
    if (filters.experience !== 'all') query = query.eq('experience_level', filters.experience);
    if (filters.location.trim()) query = query.ilike('location', `%${filters.location}%`);

    const { data } = await query;
    const mapped = (data || []).map(p => ({
      ...p,
      skills: (p.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
    })) as WorkPost[];

    let filtered = mapped;
    if (filters.minPay) {
      const min = parseFloat(filters.minPay);
      filtered = filtered.filter(p => (p.pay_amount || 0) >= min);
    }

    setPosts(filtered);
    setLoading(false);
  }, [keyword, filters, categories]);

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  useEffect(() => {
    if (categories.length > 0 || filters.category === 'all') {
      fetchPosts();
    }
  }, [fetchPosts, categories.length]);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  const clearFilters = () => {
    setFilters({ category: 'all', workType: 'all', remoteType: 'all', location: '', experience: 'all', minPay: '' });
    setKeyword('');
  };

  const FilterContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Category</label>
        <Select value={filters.category} onValueChange={v => setFilters({ ...filters, category: v })}>
          <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Work Type</label>
        <Select value={filters.workType} onValueChange={v => setFilters({ ...filters, workType: v })}>
          <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {WORK_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Remote / On-Site</label>
        <Select value={filters.remoteType} onValueChange={v => setFilters({ ...filters, remoteType: v })}>
          <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            {REMOTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Experience Level</label>
        <Select value={filters.experience} onValueChange={v => setFilters({ ...filters, experience: v })}>
          <SelectTrigger><SelectValue placeholder="Any level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any level</SelectItem>
            {EXPERIENCE_LEVELS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Location</label>
        <Input placeholder="City or country" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Minimum Pay</label>
        <Input type="number" placeholder="$0" value={filters.minPay} onChange={e => setFilters({ ...filters, minPay: e.target.value })} />
      </div>
      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-1">Find Work</h1>
        <p className="text-muted-foreground text-sm mb-6">Discover opportunities that match your skills</p>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="What kind of work are you looking for?" className="pl-9" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchPosts()} />
          </div>
          <Button onClick={fetchPosts}>Search</Button>
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
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="glass-card sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Filters</h3>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : posts.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">No opportunities found</p>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
                  <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">{posts.length} {posts.length === 1 ? 'opportunity' : 'opportunities'} found</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {posts.map(post => (
                    <Link key={post.id} href={`/post/${post.id}`}>
                      <Card className="glass-card h-full hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold leading-tight mb-1 truncate">{post.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={post.profile?.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{post.profile?.display_name || 'Anonymous'}</span>
                                {post.profile?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </div>
                            </div>
                            <Badge variant="secondary" className="shrink-0">{getWorkTypeLabel(post.work_type)}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {post.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{post.location}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTimeAgo(post.created_at)}</span>
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</span>
                          </div>
                          {post.skills && post.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {post.skills.slice(0, 3).map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                              {post.skills.length > 3 && <Badge variant="outline" className="text-xs">+{post.skills.length - 3}</Badge>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
