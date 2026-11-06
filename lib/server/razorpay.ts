import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfigError } from '@/lib/server/supabase-admin';

// SERVER ONLY. Talks to the Razorpay REST API with your secret key.
const API = 'https://api.razorpay.com/v1';

export class RazorpayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConfigError(`Missing env var ${name}`);
  return v;
}

export const razorpayKeyId = () => env('RAZORPAY_KEY_ID');
export const razorpayPlanId = () => env('RAZORPAY_PLAN_ID');

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  notes?: Record<string, string> | unknown[];
}

export interface RazorpayPlan {
  id: string;
  period: string;
  interval: number;
  item: { name: string; amount: number; currency: string; description?: string };
}

async function rzp<T>(path: string, init?: { method?: string; body?: Record<string, unknown> }): Promise<T> {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method: init?.method || 'GET',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const description = (json as { error?: { description?: string } })?.error?.description;
    throw new RazorpayError(description || `Razorpay request failed (${res.status})`, res.status);
  }
  return json as T;
}

export function createRazorpaySubscription(userId: string) {
  const totalCount = parseInt(process.env.RAZORPAY_TOTAL_COUNT || '120', 10);
  return rzp<RazorpaySubscription>('/subscriptions', {
    method: 'POST',
    body: {
      plan_id: razorpayPlanId(),
      total_count: Number.isFinite(totalCount) && totalCount > 0 ? totalCount : 120,
      quantity: 1,
      customer_notify: true,
      notes: { user_id: userId },
    },
  });
}

export const fetchRazorpaySubscription = (id: string) => rzp<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}`);

export const cancelRazorpaySubscriptionAtCycleEnd = (id: string) =>
  rzp<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { cancel_at_cycle_end: 1 },
  });

/**
 * Stop billing immediately (no waiting for the end of the cycle). Used when a founder removes
 * a paid subscription or deletes a user, so the customer is never charged for something they lost.
 * If Razorpay refuses, we only continue when the subscription is already in a state that cannot bill.
 */
export async function stopRazorpayBilling(id: string): Promise<void> {
  try {
    await rzp(`/subscriptions/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: { cancel_at_cycle_end: 0 },
    });
  } catch (e) {
    if (!(e instanceof RazorpayError)) throw e;
    const current = await fetchRazorpaySubscription(id).catch(() => null);
    if (!current || !['cancelled', 'completed', 'expired', 'created', 'halted'].includes(current.status)) throw e;
  }
}

export const fetchRazorpayPlan = () => rzp<RazorpayPlan>(`/plans/${encodeURIComponent(razorpayPlanId())}`);

/** Razorpay signs the raw request body with HMAC-SHA256 using the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env('RAZORPAY_WEBHOOK_SECRET')).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature || '', 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const toIso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/**
 * Pull the latest truth from Razorpay and store it. Used by the webhook and by the
 * post-checkout sync. Fetching (instead of trusting the event payload) keeps the result
 * correct even if webhook events arrive out of order or are replayed.
 * Returns null when we have no row for this subscription id (e.g. an old, replaced one).
 */
export async function syncSubscription(admin: SupabaseClient, razorpaySubscriptionId: string) {
  const sub = await fetchRazorpaySubscription(razorpaySubscriptionId);
  const { data, error } = await admin
    .from('subscriptions')
    .update({
      status: sub.status,
      current_period_start: toIso(sub.current_start),
      current_period_end: toIso(sub.current_end),
    })
    .eq('razorpay_subscription_id', razorpaySubscriptionId)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
