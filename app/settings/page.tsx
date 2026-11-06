'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sun, Moon, Monitor, Shield, Ban, LogOut } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-provider';
import { supabase } from '@/lib/supabase/client';
import { EXPERIENCE_LEVELS } from '@/lib/constants';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({});
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; blocked_id: string; profile: Profile | null }[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
      setExperienceLevel(profile.experience_level || 'entry');
      setEducation(profile.education || '');
      setExperience(profile.experience || '');
      setPortfolioUrl(profile.portfolio_url || '');
      setSkills(profile.skills || []);
      setPrivacy(profile.privacy_settings || {});
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, profile:profiles!blocked_users_blocked_id_fkey(*)')
        .eq('blocker_id', user.id);
      setBlockedUsers((blocked as any[])?.map(b => ({ id: b.id, blocked_id: b.blocked_id, profile: b.profile })) || []);
    })();
  }, [user]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      headline,
      bio,
      location,
      avatar_url: avatarUrl,
      experience_level: experienceLevel,
      education,
      experience,
      portfolio_url: portfolioUrl,
      skills,
      privacy_settings: privacy,
    }).eq('user_id', user.id);

    if (error) { toast.error(error.message); setSaving(false); return; }
    await refreshProfile();
    setSaving(false);
    toast.success('Profile updated');
  };

  const unblock = async (id: string) => {
    await supabase.from('blocked_users').delete().eq('id', id);
    setBlockedUsers(prev => prev.filter(b => b.id !== id));
    toast.success('User unblocked');
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Profile Settings */}
        <Card className="glass-card">
          <CardHeader><h3 className="font-semibold">Profile</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl">{displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input id="avatar" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Graphic Designer" />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="loc">Location</Label>
                <Input id="loc" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div>
                <Label>Experience level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add skill..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                <Button variant="outline" onClick={addSkill}>Add</Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map(s => <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>{s} ✕</Badge>)}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edu">Education</Label>
              <Input id="edu" value={education} onChange={e => setEducation(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="exp">Experience</Label>
              <Textarea id="exp" value={experience} onChange={e => setExperience(e.target.value)} rows={2} />
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio URL</Label>
              <Input id="portfolio" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://..." />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="glass-card">
          <CardHeader><h3 className="font-semibold">Privacy</h3></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'show_location', label: 'Show my location' },
              { key: 'show_bio', label: 'Show my bio' },
              { key: 'show_skills', label: 'Show my skills' },
              { key: 'show_education', label: 'Show my education' },
              { key: 'show_experience', label: 'Show my experience' },
              { key: 'show_availability', label: 'Show my availability' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <Switch checked={privacy[item.key] !== false} onCheckedChange={(v) => setPrivacy({ ...privacy, [item.key]: v })} />
              </div>
            ))}
            <Button variant="outline" onClick={handleSave} disabled={saving}>Save Privacy Settings</Button>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="glass-card">
          <CardHeader><h3 className="font-semibold">Appearance</h3></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${theme === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                >
                  <opt.icon className="h-4 w-4" /> {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blocked Users */}
        {blockedUsers.length > 0 && (
          <Card className="glass-card">
            <CardHeader><h3 className="font-semibold">Blocked Users</h3></CardHeader>
            <CardContent className="space-y-2">
              {blockedUsers.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarImage src={b.profile?.avatar_url || undefined} /><AvatarFallback>{b.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                    <span className="text-sm">{b.profile?.display_name || 'Unknown'}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => unblock(b.id)}>Unblock</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="glass-card border-destructive/30">
          <CardHeader><h3 className="font-semibold text-destructive">Account</h3></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut().then(() => router.push('/'))}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
