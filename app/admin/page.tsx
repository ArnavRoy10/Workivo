'use client';

import { useEffect, useState } from 'react';
import { Users, FileText, Flag, BadgeCheck, UserCheck, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/shared/admin-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0, verifications: 0, applications: 0, suspended: 0 });

  useEffect(() => {
    (async () => {
      const [u, p, r, v, a] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('work_posts').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        users: u.count || 0,
        posts: p.count || 0,
        reports: r.count || 0,
        verifications: v.count || 0,
        applications: a.count || 0,
        suspended: 0,
      });
    })();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-500' },
    { label: 'Total Posts', value: stats.posts, icon: FileText, color: 'text-green-500' },
    { label: 'Applications', value: stats.applications, icon: UserCheck, color: 'text-cyan-500' },
    { label: 'Pending Reports', value: stats.reports, icon: Flag, color: 'text-red-500' },
    { label: 'Pending Verifications', value: stats.verifications, icon: BadgeCheck, color: 'text-amber-500' },
    { label: 'Suspended', value: stats.suspended, icon: AlertTriangle, color: 'text-orange-500' },
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <Card key={card.label} className="glass-card">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <span className="text-3xl font-bold">{card.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
