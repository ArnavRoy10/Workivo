/*
# Workivo Schema - Tables Only

Creates all tables for Workivo. Policies and triggers added in a follow-up migration.
*/

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- SKILLS
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  headline text,
  bio text,
  avatar_url text,
  location text,
  date_of_birth date,
  is_minor boolean DEFAULT false,
  skills text[] DEFAULT '{}',
  education text,
  experience text,
  experience_level text DEFAULT 'entry',
  portfolio_url text,
  resume_url text,
  is_verified boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  is_business boolean DEFAULT false,
  profile_views integer DEFAULT 0,
  privacy_settings jsonb DEFAULT '{"show_location": true, "show_bio": true, "show_skills": true, "show_education": true, "show_experience": true, "show_availability": true}'::jsonb,
  onboarding_completed boolean DEFAULT false,
  interested_in text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  work_types text[] DEFAULT '{}',
  remote_preference text DEFAULT 'any',
  preferred_locations text[] DEFAULT '{}',
  availability jsonb DEFAULT '[]'::jsonb,
  expected_pay numeric,
  pay_type text DEFAULT 'negotiable',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- WORK POSTS
CREATE TABLE IF NOT EXISTS work_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('looking_for_work', 'looking_for_people')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid REFERENCES categories(id),
  work_type text DEFAULT 'full-time',
  remote_type text DEFAULT 'on-site',
  location text,
  preferred_locations text[] DEFAULT '{}',
  experience_level text DEFAULT 'entry',
  education text,
  number_of_openings integer DEFAULT 1,
  working_days text[] DEFAULT '{}',
  start_time time,
  end_time time,
  availability jsonb DEFAULT '[]'::jsonb,
  pay_amount numeric,
  pay_max numeric,
  pay_type text DEFAULT 'negotiable',
  pay_frequency text,
  is_negotiable boolean DEFAULT false,
  resume_required boolean DEFAULT false,
  portfolio_required boolean DEFAULT false,
  portfolio_url text,
  application_deadline date,
  additional_questions jsonb DEFAULT '[]'::jsonb,
  age_min integer,
  age_max integer,
  status text DEFAULT 'active',
  is_featured boolean DEFAULT false,
  is_demo boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_posts_type ON work_posts(type);
CREATE INDEX IF NOT EXISTS idx_work_posts_category ON work_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_work_posts_status ON work_posts(status);
CREATE INDEX IF NOT EXISTS idx_work_posts_user ON work_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_work_posts_created ON work_posts(created_at DESC);

-- WORK POST SKILLS
CREATE TABLE IF NOT EXISTS work_post_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES work_posts(id) ON DELETE CASCADE,
  skill text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wps_post ON work_post_skills(post_id);

-- APPLICATIONS
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES work_posts(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_message text NOT NULL DEFAULT '',
  resume_url text,
  portfolio_url text,
  answers jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'submitted',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_post ON applications(post_id);
CREATE INDEX IF NOT EXISTS idx_app_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);

-- SAVED POSTS
CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES work_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- SAVED PROFILES
CREATE TABLE IF NOT EXISTS saved_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cm_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_user ON conversation_members(user_id);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  body text,
  link text,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES work_posts(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_post_id uuid REFERENCES work_posts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- BUSINESS PROFILES
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  logo_url text,
  description text,
  location text,
  website text,
  industry text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- VERIFICATION REQUESTS
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'identity',
  document_url text,
  status text DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ADMIN ACTIONS
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_id uuid,
  target_type text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- BLOCKED USERS
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);