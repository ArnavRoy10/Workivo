import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { cancelRazorpaySubscriptionAtCycleEnd, syncSubscription } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Subscription } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cancels at the end of the paid period, so the user keeps what they paid for.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    const row = data as Subscription | null;
    if (!row || !isSubscriptionActive(row)) {
      return NextResponse.json({ error: 'No active subscription to cancel.' }, { status: 404 });
    }

    if (row.razorpay_plan_id === 'comp') {
      return NextResponse.json({ error: 'This is complimentary access, so there is nothing to cancel.' }, { status: 400 });
    }

    await cancelRazorpaySubscriptionAtCycleEnd(row.razorpay_subscription_id);

    const { error } = await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('razorpay_subscription_id', row.razorpay_subscription_id);
    if (error) throw new Error(error.message);

    const updated = (await syncSubscription(admin, row.razorpay_subscription_id)) as Subscription | null;
    return NextResponse.json({ status: updated?.status ?? null, cancelAtPeriodEnd: true });
  } catch (e) {
    return errorResponse(e);
  }
}
