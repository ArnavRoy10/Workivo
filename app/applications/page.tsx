'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Inbox, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Application } from '@/lib/types';
import { formatTimeAgo, getApplicationStatusLabel, getApplicationStatusColor, getWorkTypeLabel } from '@/lib/constants';
import { toast } from 'sonner';

export default function ApplicationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [receivedApps, setReceivedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sent } = await supabase
        .from('applications')
        .select('*, post:work_posts(*, category:categories(*)), applicant:profiles!applications_applicant_id_fkey(*)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });
      setApplications((sent as Application[]) || []);

      const { data: myPosts } = await supabase.from('work_posts').select('id').eq('user_id', user.id);
      const postIds = (myPosts || []).map(p => p.id);
      if (postIds.length > 0) {
        const { data: received } = await supabase
          .from('applications')
          .select('*, post:work_posts(*, category:categories(*)), applicant:profiles!applications_applicant_id_fkey(*)')
          .in('post_id', postIds)
          .order('created_at', { ascending: false });
        setReceivedApps((received as Application[]) || []);
      }
      setLoading(false);
    })();
  }, [user]);

  const updateStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    setReceivedApps(prev => prev.map(a => a.id === appId ? { ...a, status: status as Application['status'] } : a));
    toast.success(`Application ${status}`);
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Applications</h1>
        <p className="text-muted-foreground text-sm mb-6">Track your sent and received applications</p>

        <Tabs defaultValue="sent">
          <TabsList className="mb-4">
            <TabsTrigger value="sent">Sent ({applications.length})</TabsTrigger>
            <TabsTrigger value="received">Received ({receivedApps.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-3">
            {applications.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No applications sent yet.</p><Link href="/find-work" className="text-sm text-primary hover:underline mt-2 inline-block">Browse opportunities</Link></CardContent></Card>
            ) : (
              applications.map(app => (
                <Link key={app.id} href={`/post/${app.post_id}`}>
                  <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{app.post?.title || 'Post removed'}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{app.cover_message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{getWorkTypeLabel(app.post?.work_type || '')}</Badge>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(app.created_at)}</span>
                          </div>
                        </div>
                        <Badge className={`text-xs ${getApplicationStatusColor(app.status)}`}>{getApplicationStatusLabel(app.status)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-3">
            {receivedApps.length === 0 ? (
              <Card className="glass-card"><CardContent className="py-12 text-center"><Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No applications received yet.</p><Link href="/post/create" className="text-sm text-primary hover:underline mt-2 inline-block">Create a post</Link></CardContent></Card>
            ) : (
              receivedApps.map(app => (
                <Card key={app.id} className="glass-card">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={app.applicant?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{app.applicant?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${app.applicant?.id}`} className="font-medium text-sm hover:underline">{app.applicant?.display_name || 'Anonymous'}</Link>
                          <p className="text-sm text-muted-foreground">applied to <Link href={`/post/${app.post_id}`} className="text-primary hover:underline">{app.post?.title}</Link></p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{app.cover_message}</p>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(app.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={`text-xs ${getApplicationStatusColor(app.status)}`}>{getApplicationStatusLabel(app.status)}</Badge>
                        <Select onValueChange={v => updateStatus(app.id, v)}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewed">Viewed</SelectItem>
                            <SelectItem value="shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
