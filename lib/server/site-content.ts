import { CONTENT_COLUMNS, rowsToMap, type ContentMap } from '@/lib/site-content';

/**
 * Server-side read of all text overrides. Cached for a minute and refreshed immediately when the
 * founder saves (see /api/site-content/revalidate). Any failure returns an empty map, so the site
 * simply shows the wording that is in the code.
 */
export async function fetchSiteContent(): Promise<ContentMap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const res = await fetch(`${url}/rest/v1/site_content?select=${CONTENT_COLUMNS}&limit=2000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60, tags: ['site-content'] },
    });
    if (!res.ok) return {};
    return rowsToMap(await res.json());
  } catch {
    return {};
  }
}