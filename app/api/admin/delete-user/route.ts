import { NextResponse } from 'next/server';
import { requireFounder } from '@/lib/server/auth';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { stopRazorpayBilling } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Founder only. Permanently deletes a user and, through database cascades, their profile,
// posts, applications, reviews, messages and subscription row.
export async function POST(req: Request) {
  try {
    const founder = await requireFounder(req);
    if (!founder) return NextResponse.json({ error: 'Founder access required.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!UUID.test(userId)) return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    if (userId === founder.id) return NextResponse.json({ error: 'You cannot delete your own account here.' }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: target } = await admin.from('profiles').select('is_founder, display_name').eq('user_id', userId).maybeSingle();
    if (target?.is_founder) return NextResponse.json({ error: 'A founder account cannot be deleted from the app.' }, { status: 400 });

    // Never leave a customer being billed for an account that no longer exists.
    const { data: sub } = await admin.from('subscriptions').select('razorpay_subscription_id, razorpay_plan_id').eq('user_id', userId).maybeSingle();
    if (sub && sub.razorpay_plan_id !== 'comp') {
      await stopRazorpayBilling(sub.razorpay_subscription_id);
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    await admin.from('admin_actions').insert({
      admin_id: founder.id,
      action_type: 'delete_user',
      target_id: userId,
      target_type: 'user',
      details: target?.display_name ? `Deleted user "${target.display_name}"` : 'Deleted user',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
