import type { Subscription } from '@/lib/types';

/**
 * Mirror of public.has_active_subscription() in the database.
 * The database function is what actually enforces limits; this is for UI and API checks.
 */
export function isSubscriptionActive(sub: Pick<Subscription, 'status' | 'current_period_end' | 'cancel_at_period_end'> | null | undefined): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const inPeriod = end === null || end > Date.now();
  if (sub.status === 'active' || sub.status === 'pending') return inPeriod;
  if (sub.status === 'cancelled' && sub.cancel_at_period_end) return end !== null && end > Date.now();
  return false;
}
