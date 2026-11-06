import { NextResponse } from 'next/server';
import { fetchRazorpayPlan, type RazorpayPlan } from '@/lib/server/razorpay';
import { errorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public info (name and price). Cached briefly in memory so page loads don't hit Razorpay every time.
let cache: { at: number; plan: RazorpayPlan } | null = null;

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > 5 * 60 * 1000) {
      cache = { at: Date.now(), plan: await fetchRazorpayPlan() };
    }
    const { plan } = cache;
    return NextResponse.json({
      name: plan.item.name,
      amount: plan.item.amount,
      currency: plan.item.currency,
      period: plan.period,
      interval: plan.interval,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
