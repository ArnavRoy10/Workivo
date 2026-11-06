'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Briefcase, Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { WORK_TYPES, REMOTE_TYPES, EXPERIENCE_LEVELS, DAYS_OF_WEEK } from '@/lib/constants';
import { cn } from '@/lib/utils';

const INTERESTS = [
  { value: 'looking_for_work', label: 'Looking for work', icon: Briefcase },
  { value: 'looking_for_people', label: 'Looking for people', icon: Users },
  { value: 'both', label: 'Both', icon: Check },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [interests, setInterests] = useState<string[]>([]);

  // Step 2
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('entry');

  // Step 3
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [remotePreference, setRemotePreference] = useState('any');

  // Step 4
  const [availability, setAvailability] = useState<{ day: string; start: string; end: string }[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (profile) {
      setDisplayName(profile.display_name || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setSkills(profile.skills || []);
      setEducation(profile.education || '');
      setExperience(profile.experience || '');
      setExperienceLevel(profile.experience_level || 'entry');
      setInterests(profile.interested_in || []);
      if (profile.onboarding_completed) router.push('/dashboard');
    }
  }, [user, profile, loading, router]);

  const toggleInterest = (val: string) => {
    setInterests(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]);
  };

  const toggleWorkType = (val: string) => {
    setWorkTypes(prev => prev.includes(val) ? prev.filter(w => w !== val) : [...prev, val]);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const toggleDay = (day: string) => {
    const existing = availability.find(a => a.day === day);
    if (existing) {
      setAvailability(availability.filter(a => a.day !== day));
    } else {
      setAvailability([...availability, { day, start: '09:00', end: '17:00' }]);
    }
  };

  const updateDayTime = (day: string, field: 'start' | 'end', value: string) => {
    setAvailability(availability.map(a => a.day === day ? { ...a, [field]: value } : a));
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    const age = calculateAge(dateOfBirth);
    const isMinor = age !== null && age < 18;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        headline,
        bio,
        location,
        date_of_birth: dateOfBirth || null,
        is_minor: isMinor,
        skills,
        education,
        experience,
        experience_level: experienceLevel,
        interested_in: interests,
        onboarding_completed: true,
      })
      .eq('user_id', user.id);

    if (profileError) {
      toast.error(profileError.message);
      setSaving(false);
      return;
    }

    const { error: prefsError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        work_types: workTypes,
        remote_preference: remotePreference,
        availability,
      });

    if (prefsError) {
      toast.error(prefsError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    await refreshProfile();
    toast.success('Profile setup complete!');
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = ['Interests', 'Profile', 'Preferences', 'Availability'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  step > i + 1 ? 'bg-success text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={cn('h-0.5 flex-1 rounded', step > i + 1 ? 'bg-success' : 'bg-muted')} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">Step {step} of {steps.length}: {steps[step - 1]}</p>
        </div>

        {step === 1 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">What are you interested in?</h2>
                <p className="text-muted-foreground text-sm">You can change this anytime.</p>
              </div>
              <div className="grid gap-3">
                {INTERESTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleInterest(opt.value)}
                    className={cn(
                      'flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:shadow-md',
                      interests.includes(opt.value) ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', interests.includes(opt.value) ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground')}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{opt.label}</span>
                    {interests.includes(opt.value) && <Check className="ml-auto h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
              <Button className="w-full" disabled={interests.length === 0} onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                <p className="text-muted-foreground text-sm">This information will appear on your profile.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Display name *</Label>
                  <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label htmlFor="headline">Headline</Label>
                  <Input id="headline" value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Graphic Designer & Illustrator" />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short description about you..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
                  </div>
                  <div>
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add a skill..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                    <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>
                          {s} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="education">Education</Label>
                    <Input id="education" value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. B.A. in Design" />
                  </div>
                  <div>
                    <Label htmlFor="exp-level">Experience level</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                      {EXPERIENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="experience">Experience</Label>
                  <Textarea id="experience" value={experience} onChange={e => setExperience(e.target.value)} placeholder="Briefly describe your experience..." rows={2} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!displayName.trim()} className="flex-1">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">Work preferences</h2>
                <p className="text-muted-foreground text-sm">What kind of work are you looking for?</p>
              </div>
              <div>
                <Label>Work types</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WORK_TYPES.map(wt => (
                    <label key={wt.value} className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all',
                      workTypes.includes(wt.value) ? 'border-primary bg-primary/5' : 'border-border'
                    )}>
                      <Checkbox checked={workTypes.includes(wt.value)} onCheckedChange={() => toggleWorkType(wt.value)} />
                      <span className="text-sm">{wt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Remote preference</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[{ value: 'remote', label: 'Remote' }, { value: 'on-site', label: 'On-Site' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'any', label: 'Any' }].map(r => (
                  <button key={r.value} onClick={() => setRemotePreference(r.value)} className={cn(
                    'rounded-lg border p-3 text-sm font-medium transition-all',
                    remotePreference === r.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'
                  )}>
                    {r.label}
                  </button>
                ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">Availability</h2>
                <p className="text-muted-foreground text-sm">When are you available to work?</p>
              </div>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map(day => {
                  const selected = availability.find(a => a.day === day);
                  return (
                    <div key={day} className={cn('rounded-lg border p-3 transition-all', selected ? 'border-primary bg-primary/5' : 'border-border')}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={!!selected} onCheckedChange={() => toggleDay(day)} />
                          <span className="text-sm font-medium capitalize">{day}</span>
                        </label>
                        {selected && (
                          <div className="flex items-center gap-2">
                            <Input type="time" value={selected.start} onChange={e => updateDayTime(day, 'start', e.target.value)} className="w-28 h-8 text-xs" />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input type="time" value={selected.end} onChange={e => updateDayTime(day, 'end', e.target.value)} className="w-28 h-8 text-xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleComplete} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
