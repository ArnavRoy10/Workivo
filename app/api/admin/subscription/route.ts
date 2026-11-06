import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { stopRazorpayBilling, syncSubscription } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';
import { isSubscriptionActive } from '@/lib/subscription';
import type { Subscription } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Founder only.
//   grant  -> complimentary subscription (optionally for N days). Refuses if the user has a real paid one.
//   revoke -> removes a complimentary one, or cancels a paid one IMMEDIATELY (no refund is issued).
export async function POST(req: Request) {
  try {
    const founder = await requireFounder(req);
    if (!founder) return NextResponse.json({ error: 'Founder access required.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
    const action = body.action;
    if (!UUID.test(userId) || (action !== 'grant' && action !== 'revoke')) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    const row = data as Subscription | null;

    if (action === 'grant') {
      if (row && row.razorpay_plan_id !== 'comp' && isSubscriptionActive(row)) {
        return NextResponse.json({ error: 'This user already has a paid subscription. Revoke it first if you want to replace it.' }, { status: 409 });
      }
      let periodEnd: string | null = null;
      if (body.days !== undefined && body.days !== null) {
        const days = Number(body.days);
        if (!Number.isFinite(days) || days <= 0 || days > 3650) {
          return NextResponse.json({ error: 'Days must be between 1 and 3650.' }, { status: 400 });
        }
        periodEnd = new Date(Date.now() + days * 86400000).toISOString();
      }
      const { error } = await admin.from('subscriptions').upsert(
        {
          user_id: userId,
          razorpay_subscription_id: `comp_${userId}`,
          razorpay_plan_id: 'comp',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          cancel_at_period_end: false,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw new Error(error.message);
    } else {
      if (!row) return NextResponse.json({ error: 'This user has no subscription.' }, { status: 404 });
      if (row.razorpay_plan_id === 'comp') {
        const { error } = await admin.from('subscriptions').delete().eq('user_id', userId);
        if (error) throw new Error(error.message);
      } else {
        await stopRazorpayBilling(row.razorpay_subscription_id);
        await syncSubscription(admin, row.razorpay_subscription_id);
        const { error } = await admin.from('subscriptions').update({ cancel_at_period_end: false }).eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    }

    await admin.from('admin_actions').insert({
      admin_id: founder.id,
      action_type: action === 'grant' ? 'grant_subscription' : 'revoke_subscription',
      target_id: userId,
      target_type: 'user',
      details: action === 'grant' ? (body.days ? `Complimentary access for ${body.days} days` : 'Complimentary access, no end date') : 'Subscription revoked',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
