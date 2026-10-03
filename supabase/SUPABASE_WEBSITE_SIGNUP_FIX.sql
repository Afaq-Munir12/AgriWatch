-- AgriWatch website signup multi-role compatibility
-- Run in Supabase SQL Editor if you have NOT already run SUPABASE_MULTI_ROLE_SETUP.sql.
-- This does NOT add an id column; the updated frontend no longer requires one.

DO $$
DECLARE
  c RECORD;
  user_attnum smallint;
BEGIN
  SELECT attnum INTO user_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.website_signup_requests'::regclass
    AND attname = 'user_id'
    AND NOT attisdropped;

  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.website_signup_requests'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[user_attnum]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.website_signup_requests DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS website_signup_requests_user_role_uq
ON public.website_signup_requests (user_id, role);
