/*
# Employer subscriptions (Razorpay)

- subscriptions table: one row per user, written ONLY by the server (service role)
  after Razorpay confirms. Users can read their own row; nobody can write from the browser.
- has_active_subscription(uid): the single definition of "is this user paid up".
- Hiring-post limit: accounts without an active subscription can have 1 active
  "looking_for_people" post. Enforced here (not in the UI) so it can't be bypassed
  from the browser. Change the limit by editing free_limit below.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_subscription_id text NOT NULL UNIQUE,
  razorpay_plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Read own row only. No insert/update/delete policies on purpose:
-- only the server (service role key) can change subscription state.
DROP POLICY IF EXISTS "subscriptions_read_own" ON subscriptions;
CREATE POLICY "subscriptions_read_own" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Is this user currently entitled to paid features?
-- A cancelled-at-cycle-end subscription keeps access until the paid period ends.
CREATE OR REPLACE FUNCTION public.has_active_subscription(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = uid
      AND (
        (s.status IN ('active', 'pending')
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR
        (s.status = 'cancelled' AND s.cancel_at_period_end
          AND s.current_period_end IS NOT NULL AND s.current_period_end > now())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated;

-- Hiring-post limit for unpaid accounts
CREATE OR REPLACE FUNCTION public.enforce_hiring_post_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_limit constant integer := 1;
  active_count integer;
BEGIN
  IF NEW.type = 'looking_for_people' AND NEW.status = 'active' THEN
    -- Already an active hiring post: nothing new is being activated
    IF TG_OP = 'UPDATE' AND OLD.type = 'looking_for_people' AND OLD.status = 'active' THEN
      RETURN NEW;
    END IF;
    -- SQL editor / service role (no signed-in user): don't block
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_active_subscription(NEW.user_id) THEN
      SELECT count(*) INTO active_count
      FROM work_posts wp
      WHERE wp.user_id = NEW.user_id
        AND wp.type = 'looking_for_people'
        AND wp.status = 'active'
        AND wp.id IS DISTINCT FROM NEW.id;
      IF active_count >= free_limit THEN
        RAISE EXCEPTION 'HIRING_LIMIT: Free accounts can have % active hiring post. Subscribe on the Billing page to post more.', free_limit;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_posts_hiring_limit ON work_posts;
CREATE TRIGGER work_posts_hiring_limit
  BEFORE INSERT OR UPDATE OF status, type ON work_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hiring_post_limit();
