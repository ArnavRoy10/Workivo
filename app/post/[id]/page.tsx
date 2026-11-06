'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  MapPin, Clock, TrendingUp, BadgeCheck, Bookmark, Share2, Flag,
  ArrowLeft, Send, MessageSquare, Loader2, Briefcase, Users, Trash2, ExternalLink, FileText, Globe,
} from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { isSafeHttpUrl } from '@/lib/url';
import type { WorkPost, Profile } from '@/lib/types';
import { formatTimeAgo, formatPay, getWorkTypeLabel, getRemoteTypeLabel, getExperienceLabel, REPORT_REASONS } from '@/lib/constants';
import { calculateMatch } from '@/lib/matching';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<WorkPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [prefs, setPrefs] = useState<{ work_types: string[]; remote_preference: string; expected_pay: number | null } | null>(null);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      const { data } = await supabase
        .from('work_posts')
        .select('*, category:categories(*), profile:profiles!work_posts_user_id_fkey(id, display_name, avatar_url, is_verified, location, headline), skills:work_post_skills(skill)')
        .eq('id', params.id as string)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }

      const mapped = {
        ...data,
        skills: (data.skills as { skill: string }[] | undefined)?.map(s => s.skill) || [],
      } as WorkPost;
      setPost(mapped);

      // Increment view count
      await supabase.rpc('increment_view_count', { post_id: params.id as string }).then(() => {});

      if (user) {
        const { data: saved } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', params.id as string)
          .maybeSingle();
        setIsSaved(!!saved);

        const { data: app } = await supabase
          .from('applications')
          .select('id')
          .eq('post_id', params.id as string)
          .eq('applicant_id', user.id)
          .maybeSingle();
        setHasApplied(!!app);

        const { data: p } = await supabase
          .from('user_preferences')
          .select('work_types, remote_preference, expected_pay')
          .eq('user_id', user.id)
          .maybeSingle();
        setPrefs(p as typeof prefs);
      }

      setLoading(false);
    })();
  }, [params.id, user]);

  const handleSave = async () => {
    if (!user) { router.push('/login'); return; }
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', params.id as string);
      setIsSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_posts').insert({ user_id: user.id, post_id: params.id as string });
      setIsSaved(true);
      toast.success('Saved to your list');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: post?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleApply = async () => {
    if (!user) { router.push('/login'); return; }
    setApplying(true);
    const { error } = await supabase.from('applications').insert({
      post_id: params.id as string,
      applicant_id: user.id,
      cover_message: coverMessage,
      resume_url: resumeUrl || null,
      portfolio_url: portfolioUrl || null,
      answers: post?.additional_questions?.map((q, i) => ({ question: q.question, answer: answers[i] || '' })) || [],
    });

    if (error) {
      toast.error(error.message);
      setApplying(false);
      return;
    }

    // Create notification for post owner
    if (post?.user_id) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        type: 'new_application',
        title: 'New application received',
        body: `${profile?.display_name || 'Someone'} applied to "${post.title}"`,
        link: `/applications`,
      });
    }

    setApplying(false);
    setShowApply(false);
    setHasApplied(true);
    toast.success('Application submitted!');
  };

  const handleReport = async () => {
    if (!user) { router.push('/login'); return; }
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_post_id: params.id as string,
      reported_user_id: post?.user_id || null,
      reason: reportReason,
      details: reportDetails,
    });
    if (error) { toast.error(error.message); return; }
    setShowReport(false);
    toast.success('Report submitted. Our team will review it.');
    setReportReason('');
    setReportDetails('');
  };

  const handleMessage = async () => {
    if (!user) { router.push('/login'); return; }
    if (!post || messaging) return;
    setMessaging(true);
    // start_conversation reuses an existing one-to-one conversation, so this never creates duplicates.
    const { error } = await supabase.rpc('start_conversation', { other_user: post.user_id });
    setMessaging(false);
    if (error) { toast.error(error.message || 'Could not start the conversation'); return; }
    router.push('/messages');
  };

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    const { error } = await supabase.from('work_posts').delete().eq('id', post.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Post deleted');
    router.push('/dashboard/posts');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">This post doesn&apos;t exist or has been removed.</p>
          <Button onClick={() => router.push('/find-work')}>Back to Find Work</Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === post.user_id;
  const match = profile && post ? calculateMatch(post, profile, prefs) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{getWorkTypeLabel(post.work_type)}</Badge>
                      <Badge variant="outline">{getRemoteTypeLabel(post.remote_type)}</Badge>
                      {post.type === 'looking_for_work' && <Badge className="bg-emerald-100 text-emerald-700">Available for work</Badge>}
                      {post.is_featured && <Badge className="bg-amber-100 text-amber-700">Featured</Badge>}
                    </div>
                    <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={post.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{post.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <button className="hover:underline" onClick={() => router.push(`/profile/${post.profile?.id}`)}>
                        {post.profile?.display_name || 'Anonymous'}
                      </button>
                      {post.profile?.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      <span>·</span>
                      <span>{formatTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  {post.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{post.location}</span>}
                  <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />{formatPay(post.pay_amount, post.pay_max, post.pay_type, post.is_negotiable)}</span>
                  {post.working_days.length > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{post.working_days.length} days/week</span>}
                  {post.number_of_openings > 1 && <span className="flex items-center gap-1"><Users className="h-4 w-4" />{post.number_of_openings} openings</span>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{post.description}</p>
              </CardContent>
            </Card>

            {/* Links (job-seeker posts) */}
            {(isSafeHttpUrl(post.resume_url) || isSafeHttpUrl(post.portfolio_url)) && (
              <Card className="glass-card">
                <CardHeader><h3 className="font-semibold">Links</h3></CardHeader>
                <CardContent className="space-y-2">
                  {isSafeHttpUrl(post.resume_url) && (
                    <a href={post.resume_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-secondary transition-colors">
                      <FileText className="h-4 w-4 text-primary" /> <span className="flex-1">Resume</span> <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                  {isSafeHttpUrl(post.portfolio_url) && (
                    <a href={post.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-secondary transition-colors">
                      <Globe className="h-4 w-4 text-primary" /> <span className="flex-1">Portfolio / website</span> <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">These links were added by the poster and open in a new tab. Only open links you trust.</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {post.skills && post.skills.length > 0 && (
              <Card className="glass-card">
                <CardHeader><h3 className="font-semibold">Skills</h3></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {post.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card className="glass-card">
              <CardHeader><h3 className="font-semibold">Details</h3></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Experience level</span><p className="font-medium">{getExperienceLabel(post.experience_level)}</p></div>
                  <div><span className="text-muted-foreground">Category</span><p className="font-medium">{post.category?.name || 'N/A'}</p></div>
                  {post.education && <div><span className="text-muted-foreground">Education</span><p className="font-medium">{post.education}</p></div>}
                  {post.application_deadline && <div><span className="text-muted-foreground">Deadline</span><p className="font-medium">{new Date(post.application_deadline).toLocaleDateString()}</p></div>}
                  {post.start_time && <div><span className="text-muted-foreground">Hours</span><p className="font-medium">{post.start_time} - {post.end_time}</p></div>}
                </div>
                {post.working_days.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Working days</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {post.working_days.map(d => <Badge key={d} variant="outline" className="capitalize text-xs">{d}</Badge>)}
                    </div>
                  </div>
                )}
                {post.additional_questions && post.additional_questions.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Questions for applicants</span>
                    <ul className="mt-1 space-y-1">
                      {post.additional_questions.map((q, i) => <li key={i} className="text-sm">• {q.question}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Match indicator */}
            {match && !isOwner && post.type === 'looking_for_people' && (
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${match.level === 'strong' ? 'bg-green-100 text-green-700' : match.level === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {match.level === 'strong' ? 'Strong Match' : match.level === 'good' ? 'Good Match' : 'Weak Match'} · {match.score}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Approximate compatibility score</p>
                    {match.reasons.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {match.reasons.map((r, i) => <p key={i} className="text-xs text-muted-foreground">✓ {r}</p>)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card className="glass-card">
              <CardContent className="pt-6 space-y-3">
                {isOwner ? (
                  <>
                    {post.type === 'looking_for_people' && (
                      <Button className="w-full" variant="outline" onClick={() => router.push('/applications')}>
                        <Users className="mr-2 h-4 w-4" /> View Applications
                      </Button>
                    )}
                    <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/posts')}>
                      <Briefcase className="mr-2 h-4 w-4" /> Manage Post
                    </Button>
                    <Button className="w-full text-destructive hover:text-destructive" variant="outline" onClick={() => setShowDelete(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete post
                    </Button>
                  </>
                ) : (
                  <>
                    {post.type === 'looking_for_people' ? (
                      hasApplied ? (
                        <Button className="w-full" disabled>Applied</Button>
                      ) : (
                        <Dialog open={showApply} onOpenChange={setShowApply}>
                          <DialogTrigger asChild>
                            <Button className="w-full"><Send className="mr-2 h-4 w-4" /> Apply Now</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Apply to {post.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="cover">Cover message *</Label>
                                <Textarea id="cover" value={coverMessage} onChange={e => setCoverMessage(e.target.value)} placeholder="Why are you a good fit?" rows={4} />
                              </div>
                              {post.resume_required && (
                                <div>
                                  <Label htmlFor="resume">Resume URL</Label>
                                  <Input id="resume" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="Link to your resume" />
                                </div>
                              )}
                              {post.portfolio_required && (
                                <div>
                                  <Label htmlFor="portfolio">Portfolio URL</Label>
                                  <Input id="portfolio" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="Link to your portfolio" />
                                </div>
                              )}
                              {post.additional_questions?.map((q, i) => (
                                <div key={i}>
                                  <Label>{q.question}</Label>
                                  <Textarea value={answers[i] || ''} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }} rows={2} />
                                </div>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
                              <Button onClick={handleApply} disabled={applying || !coverMessage.trim()}>
                                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Application
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )
                    ) : (
                      <Button className="w-full" onClick={handleMessage} disabled={messaging}>
                        {messaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Message {post.profile?.display_name?.split(' ')[0] || 'them'}
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={handleSave}>
                      <Bookmark className={`mr-2 h-4 w-4 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                    <Dialog open={showReport} onOpenChange={setShowReport}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full text-destructive">
                          <Flag className="mr-2 h-4 w-4" /> Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Report this post</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <Label>Reason</Label>
                            <Select value={reportReason} onValueChange={setReportReason}>
                              <SelectTrigger><SelectValue placeholder="Select a reason" /></SelectTrigger>
                              <SelectContent>
                                {REPORT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="details">Additional details</Label>
                            <Textarea id="details" value={reportDetails} onChange={e => setReportDetails(e.target.value)} rows={3} placeholder="Provide more context..." />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleReport} disabled={!reportReason}>Submit Report</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Safety tip */}
            <Card className="glass-card bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  Never pay to get a job. Keep communications on Workivo. Report suspicious activity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={open => { if (!open && !deleting) setShowDelete(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{post.title}&quot; will be removed permanently
              {post.type === 'looking_for_people' ? ', along with any applications it received' : ''}. This cannot be undone.
              To hide it for now, close it from My Posts instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={e => { e.preventDefault(); handleDelete(); }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}