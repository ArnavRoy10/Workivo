'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Flag, BadgeCheck, Shield, Crown, Star, Tag, Type,
} from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const adminLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Posts', href: '/admin/posts', icon: FileText },
  { label: 'Reports', href: '/admin/reports', icon: Flag },
  { label: 'Verifications', href: '/admin/verifications', icon: BadgeCheck },
];

const founderLinks = [
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Categories', href: '/admin/categories', icon: Tag },
  { label: 'Page text', href: '/admin/site-text', icon: Type },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [founder, setFounder] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (profile?.is_admin || profile?.is_founder) {
      setAllowed(true);
      setFounder(!!profile.is_founder);
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, is_founder')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.is_admin || data?.is_founder) { setAllowed(true); setFounder(!!data.is_founder); }
      setChecking(false);
    })();
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!checking && !allowed) router.push('/dashboard');
  }, [checking, allowed, router]);

  if (checking || !allowed) {
    return <div className="flex h-screen items-center justify-center"><Shield className="h-8 w-8 animate-pulse text-muted-foreground" /></div>;
  }

  const links = founder ? [...adminLinks, ...founderLinks] : adminLinks;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 border-r bg-card flex flex-col shrink-0">
        <div className="flex h-16 items-center border-b px-6"><Logo size="sm" /></div>
        <div className="px-3 py-2">
          <Badge className="mb-2">
            {founder ? <Crown className="mr-1 h-3 w-3" /> : <Shield className="mr-1 h-3 w-3" />}
            {founder ? 'Founder Panel' : 'Admin Panel'}
          </Badge>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map(link => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
                <link.icon className="h-4 w-4" /> {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Back to App
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}