'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { WORK_TYPES, REMOTE_TYPES, EXPERIENCE_LEVELS, PAY_TYPES, DAYS_OF_WEEK } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

const STEPS = ['Details', 'Requirements', 'Schedule', 'Compensation', 'Application', 'Review'];

/** Post a job (hiring). People looking for work use /post/find-job instead. */
export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [workType, setWorkType] = useState('full-time');
  const [remoteType, setRemoteType] = useState('on-site');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [education, setEducation] = useState('');
  const [numOpenings, setNumOpenings] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [payAmount, setPayAmount] = useState('');
  const [payMax, setPayMax] = useState('');
  const [payType, setPayType] = useState('negotiable');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [resumeRequired, setResumeRequired] = useState(false);
  const [portfolioRequired, setPortfolioRequired] = useState(false);
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [additionalQuestions, setAdditionalQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState('');

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const toggleDay = (day: string) => {
    setWorkingDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const addQuestion = () => {
    const trimmed = questionInput.trim();
    if (trimmed && !additionalQuestions.includes(trimmed)) {
      setAdditionalQuestions([...additionalQuestions, trimmed]);
      setQuestionInput('');
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    setSaving(true);

    const post = {
      user_id: user.id,
      type: 'looking_for_people',
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      work_type: workType,
      remote_type: remoteType,
      location: location.trim() || null,
      experience_level: experienceLevel,
      education: education.trim() || null,
      number_of_openings: numOpenings,
      working_days: workingDays,
      start_time: startTime || null,
      end_time: endTime || null,
      pay_amount: payAmount ? parseFloat(payAmount) : null,
      pay_max: payMax ? parseFloat(payMax) : null,
      pay_type: payType,
      is_negotiable: isNegotiable,
      resume_required: resumeRequired,
      portfolio_required: portfolioRequired,
      application_deadline: applicationDeadline || null,
      additional_questions: additionalQuestions.map(q => ({ id: crypto.randomUUID(), question: q, type: 'text' })),
      status: 'active',
    };

    const { data, error } = await supabase.from('work_posts').insert(post).select('id').single();

    if (error || !data) {
      if (error?.message.includes('HIRING_LIMIT')) {
        toast.error('Free accounts can have 1 active hiring post.', {
          action: { label: 'Upgrade', onClick: () => router.push('/billing') },
        });
      } else {
        toast.error(error?.message || 'Could not publish your post.');
      }
      setSaving(false);
      return;
    }

    if (skills.length > 0) {
      await supabase.from('work_post_skills').insert(skills.map(s => ({ post_id: data.id, skill: s })));
    }

    setSaving(false);
    toast.success('Job posted successfully!');
    router.push(`/post/${data.id}`);
  };

  const totalSteps = STEPS.length;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Post a Job</h1>
        <p className="text-muted-foreground text-sm mb-1">Tell people about the opportunity you&apos;re hiring for.</p>
        <p className="text-sm text-muted-foreground mb-6">
          Looking for work yourself?{' '}
          <Link href="/post/find-job" className="text-primary hover:underline">Post that you&apos;re available</Link>.
        </p>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  step > i + 1 ? 'bg-success text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < totalSteps - 1 && <div className={cn('h-0.5 flex-1 rounded', step > i + 1 ? 'bg-success' : 'bg-muted')} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">Step {step} of {totalSteps}: {STEPS[step - 1]}</p>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Job Details</h2>
              <div>
                <Label htmlFor="title">Job title *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Part-Time Graphic Designer" />
              </div>
              <div>
                <Label htmlFor="desc">Description *</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the role and responsibilities..." rows={4} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Work type</Label>
                  <Select value={workType} onValueChange={setWorkType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Remote type</Label>
                  <Select value={remoteType} onValueChange={setRemoteType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REMOTE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="loc">Location</Label>
                <Input id="loc" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setStep(2)} disabled={!title.trim() || !description.trim()} className="w-full">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Requirements</h2>
              <div>
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Add a skill..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                  <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map(s => <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>{s} ✕</Badge>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Experience level</Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edu">Education</Label>
                  <Input id="edu" value={education} onChange={e => setEducation(e.target.value)} placeholder="e.g. Bachelor's degree" />
                </div>
              </div>
              <div>
                <Label htmlFor="openings">Number of openings</Label>
                <Input id="openings" type="number" min="1" value={numOpenings} onChange={e => setNumOpenings(parseInt(e.target.value) || 1)} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Schedule</h2>
              <div>
                <Label>Working days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <label key={day} className={cn('flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all', workingDays.includes(day) ? 'border-primary bg-primary/5' : 'border-border')}>
                      <Checkbox checked={workingDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                      <span className="text-sm capitalize">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start">Start time</Label>
                  <Input id="start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="end">End time</Label>
                  <Input id="end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Compensation */}
        {step === 4 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Compensation</h2>
              <div>
                <Label>Pay type</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {payType !== 'negotiable' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="paymin">Pay amount</Label>
                    <Input id="paymin" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label htmlFor="paymax">Pay max (optional)</Label>
                    <Input id="paymax" type="number" value={payMax} onChange={e => setPayMax(e.target.value)} placeholder="0" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={isNegotiable} onCheckedChange={v => setIsNegotiable(!!v)} />
                <span className="text-sm">Negotiable</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStep(5)} className="flex-1">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Application settings */}
        {step === 5 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-2">Application Settings</h2>
              <div>
                <Label htmlFor="deadline">Application deadline</Label>
                <Input id="deadline" type="date" value={applicationDeadline} onChange={e => setApplicationDeadline(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={resumeRequired} onCheckedChange={v => setResumeRequired(!!v)} />
                <span className="text-sm">Require resume</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={portfolioRequired} onCheckedChange={v => setPortfolioRequired(!!v)} />
                <span className="text-sm">Require portfolio</span>
              </label>
              <div>
                <Label>Additional questions</Label>
                <div className="flex gap-2">
                  <Input value={questionInput} onChange={e => setQuestionInput(e.target.value)} placeholder="Add a question..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }} />
                  <Button type="button" variant="outline" onClick={addQuestion}>Add</Button>
                </div>
                {additionalQuestions.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {additionalQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                        <span className="flex-1">{q}</span>
                        <button onClick={() => setAdditionalQuestions(additionalQuestions.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStep(6)} className="flex-1">Review <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <Card className="glass-card animate-fade-in">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Review &amp; Publish</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="font-medium">{title}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{categories.find(c => c.id === categoryId)?.name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Work type</span><span className="font-medium">{WORK_TYPES.find(w => w.value === workType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Remote</span><span className="font-medium">{REMOTE_TYPES.find(r => r.value === remoteType)?.label}</span></div>
                {location && <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{location}</span></div>}
                {skills.length > 0 && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Skills</span><div className="flex flex-wrap gap-1 justify-end">{skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div></div>}
                {workingDays.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Days</span><span className="font-medium capitalize">{workingDays.join(', ')}</span></div>}
                {payAmount && <div className="flex justify-between"><span className="text-muted-foreground">Pay</span><span className="font-medium">{payAmount}{payMax && ` - ${payMax}`}</span></div>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(5)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={handlePublish} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Publish Job
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}