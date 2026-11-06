import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/server/supabase-admin';

/** Resolve the signed-in user from an `Authorization: Bearer <supabase access token>` header. */
export async function requireUser(req: Request): Promise<User | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Same as requireUser, but only returns the user if their profile has is_founder = true. */
export async function requireFounder(req: Request): Promise<User | null> {
  const user = await requireUser(req);
  if (!user) return null;
  const { data } = await getSupabaseAdmin()
    .from('profiles')
    .select('is_founder')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.is_founder ? user : null;
}
