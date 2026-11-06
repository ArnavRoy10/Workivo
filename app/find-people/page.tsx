'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, MapPin, BadgeCheck, Filter, X, Users } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';
import { WORK_TYPES } from '@/lib/constants';

export default function FindPeoplePage() {
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState({ skill: '', workType: 'all', location: '', experience: 'all' });

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('display_name', '')
      .order('created_at', { ascending: false })
      .limit(24);

    if (keyword.trim()) {
      query = query.or(`display_name.ilike.%${keyword}%,headline.ilike.%${keyword}%,bio.ilike.%${keyword}%`);
    }
    if (filters.location.trim()) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters.experience !== 'all') {
      query = query.eq('experience_level', filters.experience);
    }

    const { data } = await query;
    let filtered = (data as Profile[]) || [];

    if (filters.skill.trim()) {
      filtered = filtered.filter(p => p.skills?.some(s => s.toLowerCase().includes(filters.skill.toLowerCase())));
    }
    if (filters.workType !== 'all') {
      // Can't filter by work_type directly on profiles; skip or use interested_in
    }

    setPeople(filtered);
    setLoading(false);
  }, [keyword, filters]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  const clearFilters = () => {
    setFilters({ skill: '', workType: 'all', location: '', experience: 'all' });
    setKeyword('');
  };

  const FilterContent = () => (
    <div className="space-y-4">
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-1">Find People</h1>
        <p className="text-muted-foreground text-sm mb-6">Discover talented people looking for work</p>

        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, headline, or bio" className="pl-9" value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchPeople()} />
          </div>
          <Button onClick={fetchPeople}>Search</Button>
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
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="glass-card sticky top-20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Filters</h3>
                <FilterContent />
              </CardContent>
            </Card>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : people.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">No people found</p>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
                  <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">{people.length} {people.length === 1 ? 'person' : 'people'} found</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map(person => (
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
