import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { syncSubscription } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Subscription } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by the billing page right after checkout, so the user doesn't have to wait for the webhook.
// It only ever syncs the caller's own subscription, and the data comes from Razorpay, not the browser.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: row } = await admin.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    if (!row) return NextResponse.json({ error: 'No subscription found.' }, { status: 404 });
    if (row.razorpay_plan_id === 'comp') {
      return NextResponse.json({ status: row.status, active: isSubscriptionActive(row as Subscription) });
    }

    const updated = (await syncSubscription(admin, row.razorpay_subscription_id)) as Subscription | null;
    return NextResponse.json({ status: updated?.status ?? null, active: isSubscriptionActive(updated) });
  } catch (e) {
    return errorResponse(e);
  }
}
