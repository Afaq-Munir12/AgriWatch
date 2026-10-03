-- AgriWatch: one Supabase auth identity can own separate role profiles.
-- Run ONCE in Supabase -> SQL Editor.

-- Remove a legacy UNIQUE(user_id) constraint if present.
-- This intentionally does not touch the primary key.
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


-- Remove a standalone UNIQUE INDEX(user_id) too, if an older setup created one
-- without a named table constraint. Primary-key indexes are excluded.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT idx.relname AS index_name
    FROM pg_index i
    JOIN pg_class tbl ON tbl.oid = i.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    JOIN pg_class idx ON idx.oid = i.indexrelid
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'website_signup_requests'
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnkeyatts = 1
      AND (SELECT attname FROM pg_attribute WHERE attrelid = tbl.oid AND attnum = (i.indkey::smallint[])[0]) = 'user_id'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
  END LOOP;
END $$;

-- Same user can be Farmer + Public + PDMA, but cannot duplicate one role.
CREATE UNIQUE INDEX IF NOT EXISTS website_signup_requests_user_role_uq
ON public.website_signup_requests (user_id, role);

SELECT user_id, email, role, status
FROM public.website_signup_requests
ORDER BY submitted_at DESC NULLS LAST;
