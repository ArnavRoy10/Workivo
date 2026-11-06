'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';
import { formatTimeAgo } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (error) { toast.error(error.message); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All marked as read');
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">Stay updated on your activity</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <Card key={notif.id} className={cn('glass-card hover:shadow-sm transition-shadow', !notif.is_read && 'border-primary/30 bg-primary/5')}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', notif.is_read ? 'bg-muted text-muted-foreground' : 'gradient-bg-soft text-primary')}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{notif.title}</p>
                        {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {notif.body && <p className="text-sm text-muted-foreground mt-0.5">{notif.body}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(notif.created_at)}</span>
                        {notif.link && <Link href={notif.link} className="text-xs text-primary hover:underline" onClick={() => markRead(notif.id)}>View</Link>}
                        <button onClick={() => deleteNotif(notif.id)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
