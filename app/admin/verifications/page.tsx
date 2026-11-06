'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import type { VerificationRequest, Profile } from '@/lib/types';
import { formatTimeAgo } from '@/lib/constants';

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<(VerificationRequest & { profile?: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('verification_requests')
        .select('*, profile:profiles!verification_requests_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setRequests((data as (VerificationRequest & { profile?: Profile | null })[]) || []);
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (id: string, userId: string) => {
    const { error: e1 } = await supabase.from('verification_requests').update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (e1) { toast.error(e1.message); return; }

    const { error: e2 } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
    if (e2) { toast.error(e2.message); return; }

    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    toast.success('Verification approved');
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('verification_requests').update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    toast.success('Verification rejected');
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Verification Requests</h1>
        {requests.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-12 text-center"><BadgeCheck className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No verification requests.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <Card key={req.id} className="glass-card">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={req.profile?.avatar_url || undefined} />
                        <AvatarFallback>{req.profile?.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{req.profile?.display_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{req.type}</Badge>
                          <Badge variant={req.status === 'pending' ? 'destructive' : 'secondary'} className="text-xs">{req.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(req.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleApprove(req.id, req.user_id)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(req.id)}><XCircle className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
