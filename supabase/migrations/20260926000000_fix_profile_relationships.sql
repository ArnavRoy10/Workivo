/*
# Fix profile relationships

The app joins profiles through foreign-key hints such as
profiles!work_posts_user_id_fkey, but those constraints pointed at auth.users,
so PostgREST could not find a work_posts -> profiles relationship and the
queries failed (posts looked "missing"). This re-points each constraint, under
the same name, at profiles(user_id). profiles.user_id is UNIQUE and itself
cascades from auth.users, so deletes still cascade.
*/

BEGIN;

-- Make sure every existing user has a profile row (needed before adding the FKs)
INSERT INTO profiles (user_id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

ALTER TABLE work_posts DROP CONSTRAINT IF EXISTS work_posts_user_id_fkey;
ALTER TABLE work_posts ADD CONSTRAINT work_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_applicant_id_fkey;
ALTER TABLE applications ADD CONSTRAINT applications_applicant_id_fkey
  FOREIGN KEY (applicant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE blocked_users DROP CONSTRAINT IF EXISTS blocked_users_blocked_id_fkey;
ALTER TABLE blocked_users ADD CONSTRAINT blocked_users_blocked_id_fkey
  FOREIGN KEY (blocked_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';

COMMIT;
