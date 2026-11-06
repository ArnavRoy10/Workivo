import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';
import { syncSubscription, verifyWebhookSignature } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // The signature is computed over the exact raw body, so read it as text before parsing.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      payload?: { subscription?: { entity?: { id?: string } } };
    };
    const name = event.event || '';
    const subscriptionId = event.payload?.subscription?.entity?.id;

    if (name.startsWith('subscription.') && subscriptionId) {
      await syncSubscription(getSupabaseAdmin(), subscriptionId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Non-2xx makes Razorpay retry the webhook later, which is what we want on a transient failure.
    return errorResponse(e);
  }
}
