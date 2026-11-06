/*
# Add increment_view_count RPC function

Creates a SECURITY DEFINER function to increment post view counts. This needs to be callable by authenticated users without direct update permissions.
*/

CREATE OR REPLACE FUNCTION public.increment_view_count(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE work_posts SET view_count = view_count + 1 WHERE id = post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;
