'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logAdminAction } from '@/lib/admin';
import { formatTimeAgo } from '@/lib/constants';

interface ReviewRow {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: { display_name: string } | null;
}

export default function AdminReviewsPage() {
  const { profile: me, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me?.is_founder) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, body, created_at, reviewer:profiles!reviews_reviewer_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      setReviews((data as unknown as ReviewRow[]) || []);
      setLoading(false);
    })();
  }, [me?.is_founder]);

  const remove = async (review: ReviewRow) => {
    if (!window.confirm('Delete this review permanently?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', review.id);
    if (error) { toast.error(error.message); return; }
    setReviews(prev => prev.filter(r => r.id !== review.id));
    logAdminAction('delete_review', review.id, 'review', review.body.slice(0, 80));
    toast.success('Review deleted');
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Reviews</h1>
        {authLoading || loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !me?.is_founder ? (
          <p className="text-sm text-muted-foreground">Founder access only.</p>
        ) : (
          <div className="space-y-2">
            {reviews.map(r => (
              <Card key={r.id} className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                        </span>
                        <span className="text-muted-foreground">by {r.reviewer?.display_name || 'Unknown'} · {formatTimeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{r.body || '(no text)'}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {reviews.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
