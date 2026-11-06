/*
# Workivo Schema - RLS Policies & Triggers

Enables RLS on all tables and creates security policies. Also creates triggers for new user creation and updated_at.
*/

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_post_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- CATEGORIES (public read)
DROP POLICY IF EXISTS "categories_read_all" ON categories;
CREATE POLICY "categories_read_all" ON categories FOR SELECT
  TO anon, authenticated USING (true);

-- SKILLS (public read)
DROP POLICY IF EXISTS "skills_read_all" ON skills;
CREATE POLICY "skills_read_all" ON skills FOR SELECT
  TO anon, authenticated USING (true);

-- PROFILES (public read, owner write)
DROP POLICY IF EXISTS "profiles_read_public" ON profiles;
CREATE POLICY "profiles_read_public" ON profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- USER PREFERENCES (owner only)
DROP POLICY IF EXISTS "prefs_read_own" ON user_preferences;
CREATE POLICY "prefs_read_own" ON user_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "prefs_insert_own" ON user_preferences;
CREATE POLICY "prefs_insert_own" ON user_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "prefs_update_own" ON user_preferences;
CREATE POLICY "prefs_update_own" ON user_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "prefs_delete_own" ON user_preferences;
CREATE POLICY "prefs_delete_own" ON user_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- WORK POSTS (public read active, owner write)
DROP POLICY IF EXISTS "posts_read_active" ON work_posts;
CREATE POLICY "posts_read_active" ON work_posts FOR SELECT
  TO anon, authenticated USING (status IN ('active', 'expired') OR user_id = auth.uid());
DROP POLICY IF EXISTS "posts_insert_own" ON work_posts;
CREATE POLICY "posts_insert_own" ON work_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_update_own" ON work_posts;
CREATE POLICY "posts_update_own" ON work_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete_own" ON work_posts;
CREATE POLICY "posts_delete_own" ON work_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- WORK POST SKILLS
DROP POLICY IF EXISTS "wps_read_all" ON work_post_skills;
CREATE POLICY "wps_read_all" ON work_post_skills FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.status IN ('active', 'expired'))
    OR EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "wps_insert_own" ON work_post_skills;
CREATE POLICY "wps_insert_own" ON work_post_skills FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "wps_delete_own" ON work_post_skills;
CREATE POLICY "wps_delete_own" ON work_post_skills FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  );

-- APPLICATIONS
DROP POLICY IF EXISTS "apps_read_own" ON applications;
CREATE POLICY "apps_read_own" ON applications FOR SELECT
  TO authenticated USING (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "apps_insert_own" ON applications;
CREATE POLICY "apps_insert_own" ON applications FOR INSERT
  TO authenticated WITH CHECK (applicant_id = auth.uid());
DROP POLICY IF EXISTS "apps_update_own" ON applications;
CREATE POLICY "apps_update_own" ON applications FOR UPDATE
  TO authenticated USING (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  ) WITH CHECK (
    applicant_id = auth.uid()
    OR EXISTS (SELECT 1 FROM work_posts wp WHERE wp.id = post_id AND wp.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "apps_delete_own" ON applications;
CREATE POLICY "apps_delete_own" ON applications FOR DELETE
  TO authenticated USING (applicant_id = auth.uid());

-- SAVED POSTS
DROP POLICY IF EXISTS "saved_posts_read_own" ON saved_posts;
CREATE POLICY "saved_posts_read_own" ON saved_posts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_insert_own" ON saved_posts;
CREATE POLICY "saved_posts_insert_own" ON saved_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_delete_own" ON saved_posts;
CREATE POLICY "saved_posts_delete_own" ON saved_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SAVED PROFILES
DROP POLICY IF EXISTS "saved_profiles_read_own" ON saved_profiles;
CREATE POLICY "saved_profiles_read_own" ON saved_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_profiles_insert_own" ON saved_profiles;
CREATE POLICY "saved_profiles_insert_own" ON saved_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_profiles_delete_own" ON saved_profiles;
CREATE POLICY "saved_profiles_delete_own" ON saved_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "conversations_read_members" ON conversations;
CREATE POLICY "conversations_read_members" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid())
  );

-- CONVERSATION MEMBERS
DROP POLICY IF EXISTS "cm_read_members" ON conversation_members;
CREATE POLICY "cm_read_members" ON conversation_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = conversation_id AND cm2.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "cm_insert_own" ON conversation_members;
CREATE POLICY "cm_insert_own" ON conversation_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- MESSAGES
DROP POLICY IF EXISTS "messages_read_members" ON messages;
CREATE POLICY "messages_read_members" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "messages_insert_members" ON messages;
CREATE POLICY "messages_insert_members" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "messages_update_members" ON messages;
CREATE POLICY "messages_update_members" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notif_read_own" ON notifications;
CREATE POLICY "notif_read_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- REVIEWS
DROP POLICY IF EXISTS "reviews_read_all" ON reviews;
CREATE POLICY "reviews_read_all" ON reviews FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (reviewer_id = auth.uid());

-- REPORTS
DROP POLICY IF EXISTS "reports_read_own" ON reports;
CREATE POLICY "reports_read_own" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );

-- BUSINESS PROFILES
DROP POLICY IF EXISTS "biz_read_all" ON business_profiles;
CREATE POLICY "biz_read_all" ON business_profiles FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "biz_insert_own" ON business_profiles;
CREATE POLICY "biz_insert_own" ON business_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "biz_update_own" ON business_profiles;
CREATE POLICY "biz_update_own" ON business_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "biz_delete_own" ON business_profiles;
CREATE POLICY "biz_delete_own" ON business_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- VERIFICATION REQUESTS
DROP POLICY IF EXISTS "verif_read_own_admin" ON verification_requests;
CREATE POLICY "verif_read_own_admin" ON verification_requests FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );
DROP POLICY IF EXISTS "verif_insert_own" ON verification_requests;
CREATE POLICY "verif_insert_own" ON verification_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "verif_update_admin" ON verification_requests;
CREATE POLICY "verif_update_admin" ON verification_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );

-- ADMIN ACTIONS
DROP POLICY IF EXISTS "admin_actions_read_admin" ON admin_actions;
CREATE POLICY "admin_actions_read_admin" ON admin_actions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );
DROP POLICY IF EXISTS "admin_actions_insert_admin" ON admin_actions;
CREATE POLICY "admin_actions_insert_admin" ON admin_actions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
  );

-- BLOCKED USERS
DROP POLICY IF EXISTS "blocked_read_own" ON blocked_users;
CREATE POLICY "blocked_read_own" ON blocked_users FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocked_insert_own" ON blocked_users;
CREATE POLICY "blocked_insert_own" ON blocked_users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "blocked_delete_own" ON blocked_users;
CREATE POLICY "blocked_delete_own" ON blocked_users FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS user_prefs_updated_at ON user_preferences;
CREATE TRIGGER user_prefs_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS work_posts_updated_at ON work_posts;
CREATE TRIGGER work_posts_updated_at BEFORE UPDATE ON work_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS business_profiles_updated_at ON business_profiles;
CREATE TRIGGER business_profiles_updated_at BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();