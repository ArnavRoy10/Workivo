'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, CreditCard, Loader2, AlertTriangle, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Subscription } from '@/lib/types';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

interface PlanInfo {
  name: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
}

// Must match free_limit in supabase/migrations/20260927000000_employer_subscriptions.sql
const FREE_HIRING_POSTS = 1;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function loadCheckoutScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatPrice(plan: PlanInfo) {
  const amount = plan.amount / 100;
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency, maximumFractionDigits: 2 }).format(amount);
  const unit = plan.period === 'monthly' ? 'month' : plan.period === 'yearly' ? 'year' : plan.period === 'weekly' ? 'week' : 'day';
  return `${money} / ${plan.interval > 1 ? `${plan.interval} ${unit}s` : unit}`;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

export default function BillingPage() {
  const { user, profile, session } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadSubscription = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    setSub((data as Subscription | null) ?? null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await loadSubscription();
      setLoading(false);
    })();
  }, [user, loadSubscription]);

  useEffect(() => {
    fetch('/api/razorpay/plan')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setPlan)
      .catch(() => setPlanError(true));
  }, []);

  const authHeaders = () => ({ Authorization: `Bearer ${session?.access_token || ''}` });

  const confirmPayment = async () => {
    // Razorpay confirms the payment to our webhook; this just checks sooner so the page updates fast.
    for (let i = 0; i < 6; i++) {
      const res = await fetch('/api/razorpay/sync', { method: 'POST', headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.active) {
        await loadSubscription();
        toast.success('Subscription active. You can now post unlimited hiring posts.');
        return;
      }
      await sleep(2000);
    }
    await loadSubscription();
    toast.message('Payment received. Your subscription is still activating. Refresh in a minute.');
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const scriptOk = await loadCheckoutScript();
      if (!scriptOk) {
        toast.error('Could not load the payment window. Check your connection and try again.');
        setBusy(false);
        return;
      }

      const res = await fetch('/api/razorpay/create-subscription', { method: 'POST', headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || 'Could not start checkout.');
        setBusy(false);
        return;
      }

      const checkout = new window.Razorpay!({
        key: json.keyId,
        subscription_id: json.subscriptionId,
        name: 'Workivo',
        description: 'Employer subscription',
        prefill: { name: profile?.display_name || '', email: user.email || '' },
        theme: { color: '#0ea5e9' },
        handler: async () => {
          await confirmPayment();
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on('payment.failed', (r: { error?: { description?: string } }) => {
        toast.error(r.error?.description || 'Payment failed. You have not been charged for a subscription.');
        setBusy(false);
      });
      checkout.open();
    } catch {
      toast.error('Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription? You keep access until the end of the period you already paid for.')) return;
    setBusy(true);
    const res = await fetch('/api/razorpay/cancel', { method: 'POST', headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(json.error || 'Could not cancel. Please try again.');
      return;
    }
    await loadSubscription();
    toast.success('Subscription will end at the close of your current period.');
  };

  const active = isSubscriptionActive(sub);
  const isComp = sub?.razorpay_plan_id === 'comp';
  const cancelling = active && !isComp && !!sub?.cancel_at_period_end;
  const halted = sub?.status === 'halted';
  const retrying = sub?.status === 'pending';

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Billing</h1>
        <p className="text-muted-foreground text-sm mb-6">Manage your employer subscription.</p>

        {loading ? (
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        ) : (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> {plan?.name || 'Employer subscription'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan ? formatPrice(plan) : planError ? 'Price unavailable right now' : 'Loading price...'}
                </p>
              </div>
              {active ? (
                <Badge className="gap-1"><BadgeCheck className="h-3.5 w-3.5" /> {cancelling ? 'Ending' : 'Active'}</Badge>
              ) : (
                <Badge variant="outline">Free plan</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Unlimited active hiring posts (free accounts: {FREE_HIRING_POSTS})</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> &quot;Looking for work&quot; posts, applying and messaging stay free for everyone</li>
              </ul>

              {retrying && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p>Your last payment did not go through. Razorpay is retrying it. Update your payment method if it keeps failing.</p>
                </div>
              )}
              {halted && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p>Your subscription was stopped after repeated failed payments. Subscribe again to restore access.</p>
                </div>
              )}

              {active && isComp && (
                <p className="text-sm text-muted-foreground">
                  Complimentary access from Workivo{sub?.current_period_end ? `, until ${fmtDate(sub.current_period_end)}` : ''}.
                </p>
              )}
              {active && !isComp && sub?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {cancelling
                    ? `Your subscription ends on ${fmtDate(sub.current_period_end)}. You keep access until then.`
                    : `Renews on ${fmtDate(sub.current_period_end)}.`}
                </p>
              )}

              <div className="flex gap-2">
                {active ? (
                  !cancelling && !isComp && (
                    <Button variant="outline" onClick={handleCancel} disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Cancel subscription
                    </Button>
                  )
                ) : (
                  <Button onClick={handleSubscribe} disabled={busy || planError}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {halted ? 'Subscribe again' : 'Subscribe'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
