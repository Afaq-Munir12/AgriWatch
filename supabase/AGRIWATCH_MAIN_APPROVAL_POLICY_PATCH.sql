-- AgriWatch MAIN (PRODUCTION): restrict self-submitted role approval.
-- Run only in the ORIGINAL AgriWatch project, after verifying a database backup.
-- This changes exactly ONE INSERT RLS policy, and no existing data.
-- Do NOT run the staging setup SQL (01/02/03/04) against main.
-- Verify the currently installed policy and app behavior before running.

BEGIN;

DO $check$
BEGIN
  IF to_regclass('public.website_signup_requests') IS NULL THEN
    RAISE EXCEPTION 'STOP: expected existing public.website_signup_requests not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'website_signup_requests'
      AND policyname = 'user can create own website request'
  ) THEN
    RAISE EXCEPTION 'STOP: expected existing user INSERT policy not found; do not replace unknown policies';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.website_signup_requests'::regclass
      AND tgname = 'protect_website_request_fields'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'STOP: protected registration update trigger missing; review first';
  END IF;
  IF to_regprocedure('public.is_agriwatch_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'STOP: admin role helper missing; review existing setup first';
  END IF;
END;
$check$;

DROP POLICY "user can create own website request" ON public.website_signup_requests;

CREATE POLICY "user can create own website request"
ON public.website_signup_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    (role = 'public' AND status = 'approved')
    OR (role IN ('farmer','pdma') AND status = 'pending')
  )
);

COMMIT;

-- Read-only check of resulting INSERT policy (expected one row with rule above).
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'website_signup_requests'
  AND policyname = 'user can create own website request';
