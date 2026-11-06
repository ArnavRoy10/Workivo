import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import {
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  razorpayKeyId,
  razorpayPlanId,
} from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Subscription } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    const existing = data as Subscription | null;

    if (isSubscriptionActive(existing)) {
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 });
    }

    // Reuse an unpaid subscription instead of creating a new one on every click.
    let subscriptionId: string | null = null;
    if (existing?.status === 'created') {
      const current = await fetchRazorpaySubscription(existing.razorpay_subscription_id).catch(() => null);
      if (current && current.status === 'created' && current.plan_id === razorpayPlanId()) {
        subscriptionId = current.id;
      }
    }

    if (!subscriptionId) {
      const created = await createRazorpaySubscription(user.id);
      subscriptionId = created.id;
      const { error } = await admin.from('subscriptions').upsert(
        {
          user_id: user.id,
          razorpay_subscription_id: created.id,
          razorpay_plan_id: created.plan_id,
          status: created.status,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ subscriptionId, keyId: razorpayKeyId() });
  } catch (e) {
    return errorResponse(e);
  }
}
