/*
# Founder controls

- profiles.is_founder: the owner of the platform. Set ONLY from the SQL editor.
- is_founder() / is_staff(): role checks used by the policies below.
- Founder can read/write/delete almost everything (policies below). Private data
  (messages, conversations, blocked users, user preferences, saved items) is deliberately excluded.
- Staff (admin or founder) can see/moderate every post and verify users.
- Privilege trigger: nobody can promote themselves. Only a founder can change is_admin/is_founder;
  only staff can change is_verified; an admin editing someone else's profile can change nothing but is_verified.
  This replaces the earlier protect_profile_privileges trigger if you added it.
- Deleting a whole user and granting/removing subscriptions go through server API routes
  (they need the service role key and have to talk to Razorpay).
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

-- Role helpers (SECURITY DEFINER so they can read profiles without RLS recursion)
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_founder FROM profiles p WHERE p.user_id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT (p.is_founder OR p.is_admin) FROM profiles p WHERE p.user_id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION public.is_founder() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;

-- Privilege protection (no self-promotion)
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SQL editor / service role: no signed-in user, allow everything
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_founder() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_founder := false;
    NEW.is_verified := false;
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin OR NEW.is_founder IS DISTINCT FROM OLD.is_founder THEN
    RAISE EXCEPTION 'Only the founder can change admin or founder status';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can change verification';
  END IF;

  -- Staff editing someone else's profile may only change is_verified
  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    IF (to_jsonb(NEW) - 'is_verified' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'is_verified' - 'updated_at') THEN
      RAISE EXCEPTION 'You can only change verification on another user''s profile';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileges ON profiles;
CREATE TRIGGER profiles_protect_privileges
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Staff (admin or founder): moderate profiles' verification and every post
DROP POLICY IF EXISTS "profiles_update_staff" ON profiles;
CREATE POLICY "profiles_update_staff" ON profiles FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "posts_read_staff" ON work_posts;
CREATE POLICY "posts_read_staff" ON work_posts FOR SELECT
  TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "posts_update_staff" ON work_posts;
CREATE POLICY "posts_update_staff" ON work_posts FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Founder: full access to everything below
DROP POLICY IF EXISTS "founder_all_profiles" ON profiles;
CREATE POLICY "founder_all_profiles" ON profiles FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_work_posts" ON work_posts;
CREATE POLICY "founder_all_work_posts" ON work_posts FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_work_post_skills" ON work_post_skills;
CREATE POLICY "founder_all_work_post_skills" ON work_post_skills FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_applications" ON applications;
CREATE POLICY "founder_all_applications" ON applications FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_reviews" ON reviews;
CREATE POLICY "founder_all_reviews" ON reviews FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_reports" ON reports;
CREATE POLICY "founder_all_reports" ON reports FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_business_profiles" ON business_profiles;
CREATE POLICY "founder_all_business_profiles" ON business_profiles FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_verification_requests" ON verification_requests;
CREATE POLICY "founder_all_verification_requests" ON verification_requests FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_categories" ON categories;
CREATE POLICY "founder_all_categories" ON categories FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_skills" ON skills;
CREATE POLICY "founder_all_skills" ON skills FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_notifications" ON notifications;
CREATE POLICY "founder_all_notifications" ON notifications FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

DROP POLICY IF EXISTS "founder_all_admin_actions" ON admin_actions;
CREATE POLICY "founder_all_admin_actions" ON admin_actions FOR ALL
  TO authenticated USING (public.is_founder()) WITH CHECK (public.is_founder());

-- Subscriptions: founder can READ (to show status). Writes go through the server API
-- so a comp can never overwrite a real paid Razorpay subscription by accident.
DROP POLICY IF EXISTS "founder_read_subscriptions" ON subscriptions;
CREATE POLICY "founder_read_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (public.is_founder());
