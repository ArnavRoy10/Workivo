'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, BadgeCheck, Loader2, Shield, Gift, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { adminApi, logAdminAction } from '@/lib/admin';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Profile, Subscription } from '@/lib/types';

type SubRow = Pick<Subscription, 'user_id' | 'status' | 'razorpay_plan_id' | 'current_period_end' | 'cancel_at_period_end'>;

export default function AdminUsersPage() {
  const { profile: me, session } = useAuth();
  const isFounder = !!me?.is_founder;
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Record<string, SubRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    if (search.trim()) query = query.ilike('display_name', `%${search.trim()}%`);
    const { data } = await query;
    const list = (data as Profile[]) || [];
    setUsers(list);
    if (isFounder && list.length > 0) {
      const { data: s } = await supabase
        .from('subscriptions')
        .select('user_id, status, razorpay_plan_id, current_period_end, cancel_at_period_end')
        .in('user_id', list.map(u => u.user_id));
      setSubs(Object.fromEntries(((s as SubRow[]) || []).map(r => [r.user_id, r])));
    }
    setLoading(false);
  }, [search, isFounder]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const toggleVerify = async (user: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_verified: !user.is_verified }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: !user.is_verified } : u));
    logAdminAction(user.is_verified ? 'unverify_user' : 'verify_user', user.user_id, 'user', user.display_name);
    toast.success(user.is_verified ? 'Unverified' : 'Verified');
  };

  const toggleAdmin = async (user: Profile) => {
    const next = !user.is_admin;
    if (!window.confirm(`${next ? 'Make' : 'Remove'} ${user.display_name || 'this user'} ${next ? 'an admin' : 'as admin'}?`)) return;
    const { error } = await supabase.from('profiles').update({ is_admin: next }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: next } : u));
    logAdminAction(next ? 'grant_admin' : 'revoke_admin', user.user_id, 'user', user.display_name);
    toast.success(next ? 'Admin granted' : 'Admin removed');
  };

  const giveSubscription = async (user: Profile) => {
    const input = window.prompt(`Give ${user.display_name || 'this user'} free subscription access.\nHow many days? Leave empty for no end date.`);
    if (input === null) return;
    const days = input.trim() ? parseInt(input.trim(), 10) : null;
    if (days !== null && (!Number.isFinite(days) || days <= 0)) { toast.error('Enter a whole number of days.'); return; }
    setBusyId(user.id);
    try {
      await adminApi(session?.access_token, '/api/admin/subscription', { userId: user.user_id, action: 'grant', days });
      toast.success('Subscription granted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
    setBusyId(null);
  };

  const removeSubscription = async (user: Profile, sub: SubRow) => {
    const comp = sub.razorpay_plan_id === 'comp';
    const msg = comp
      ? `Remove the free subscription from ${user.display_name}?`
      : `${user.display_name} PAID for this subscription.\nThis cancels it in Razorpay immediately. No refund is issued automatically.\nContinue?`;
    if (!window.confirm(msg)) return;
    setBusyId(user.id);
    try {
      await adminApi(session?.access_token, '/api/admin/subscription', { userId: user.user_id, action: 'revoke' });
      toast.success('Subscription removed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
    setBusyId(null);
  };

  const deleteUser = async (user: Profile) => {
    const answer = window.prompt(
      `PERMANENTLY delete ${user.display_name || 'this user'}?\nThis removes their account, posts, applications, reviews and messages, and cancels any paid subscription.\nThis cannot be undone.\n\nType DELETE to confirm.`
    );
    if (answer !== 'DELETE') return;
    setBusyId(user.id);
    try {
      await adminApi(session?.access_token, '/api/admin/delete-user', { userId: user.user_id });
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success('User deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
    setBusyId(null);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {users.map(user => {
              const sub = subs[user.user_id];
              const subActive = isSubscriptionActive(sub);
              const isSelf = user.user_id === me?.user_id;
              const busy = busyId === user.id;
              return (
                <Card key={user.id} className="glass-card">
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.display_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-[160px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{user.display_name || '(no name)'}</span>
                          {user.is_founder && <Badge className="text-xs"><Crown className="mr-1 h-3 w-3" /> Founder</Badge>}
                          {user.is_admin && !user.is_founder && <Badge className="text-xs">Admin</Badge>}
                          {user.is_verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          {user.is_minor && <Badge variant="outline" className="text-xs">Minor</Badge>}
                          {subActive && <Badge variant="outline" className="text-xs">{sub?.razorpay_plan_id === 'comp' ? 'Free subscription' : 'Paid subscription'}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.headline || user.location || 'No info'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => toggleVerify(user)} disabled={busy}>
                          <BadgeCheck className="mr-1 h-3.5 w-3.5" /> {user.is_verified ? 'Unverify' : 'Verify'}
                        </Button>
                        {isFounder && !user.is_founder && (
                          <Button variant="outline" size="sm" onClick={() => toggleAdmin(user)} disabled={busy}>
                            <Shield className="mr-1 h-3.5 w-3.5" /> {user.is_admin ? 'Remove admin' : 'Make admin'}
                          </Button>
                        )}
                        {isFounder && (subActive && sub ? (
                          <Button variant="outline" size="sm" onClick={() => removeSubscription(user, sub)} disabled={busy}>
                            <Gift className="mr-1 h-3.5 w-3.5" /> Remove subscription
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => giveSubscription(user)} disabled={busy}>
                            <Gift className="mr-1 h-3.5 w-3.5" /> Give subscription
                          </Button>
                        ))}
                        {isFounder && !isSelf && !user.is_founder && (
                          <Button variant="ghost" size="sm" onClick={() => deleteUser(user)} disabled={busy}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {users.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No users found.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
