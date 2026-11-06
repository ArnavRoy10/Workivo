import { supabase } from '@/lib/supabase/client';

/** Calls a founder-only server route with the signed-in user's access token. */
export async function adminApi(accessToken: string | undefined, path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken || ''}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

/** Writes to the audit log (admin_actions). Failures are ignored so they never block the action itself. */
export async function logAdminAction(actionType: string, targetId: string | null, targetType: string, details?: string) {
  await supabase.from('admin_actions').insert({
    action_type: actionType,
    target_id: targetId,
    target_type: targetType,
    details: details || null,
  });
}
