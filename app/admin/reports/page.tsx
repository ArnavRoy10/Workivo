'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import type { Report } from '@/lib/types';
import { formatTimeAgo, REPORT_REASONS } from '@/lib/constants';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      setReports((data as Report[]) || []);
      setLoading(false);
    })();
  }, []);

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    const adminNotes = notes[id] || '';
    const { error } = await supabase.from('reports').update({
      status,
      admin_notes: adminNotes,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setReports(prev => prev.map(r => r.id === id ? { ...r, status, admin_notes: adminNotes } : r));
    toast.success(status === 'resolved' ? 'Report resolved' : 'Report dismissed');
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        {reports.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-12 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No reports yet.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <Card key={report.id} className="glass-card">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'} className="text-xs">{report.status}</Badge>
                        <Badge variant="outline" className="text-xs">{REPORT_REASONS.find(r => r.value === report.reason)?.label || report.reason}</Badge>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(report.created_at)}</span>
                      </div>
                      {report.details && <p className="text-sm text-muted-foreground mt-2">{report.details}</p>}
                      {report.admin_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {report.admin_notes}</p>}
                    </div>
                  </div>
                  {report.status === 'pending' && (
                    <div className="space-y-2 mt-3">
                      <div>
                        <Label htmlFor={`notes-${report.id}`}>Moderation notes</Label>
                        <Textarea id={`notes-${report.id}`} rows={2} value={notes[report.id] || ''} onChange={e => setNotes({ ...notes, [report.id]: e.target.value })} placeholder="Add notes about this report..." />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => resolveReport(report.id, 'resolved')}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve</Button>
                        <Button size="sm" variant="outline" onClick={() => resolveReport(report.id, 'dismissed')}><XCircle className="mr-1 h-3.5 w-3.5" /> Dismiss</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
