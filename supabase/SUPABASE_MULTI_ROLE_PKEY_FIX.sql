-- AgriWatch v5: allow ONE Supabase auth user to own multiple AgriWatch roles.
-- Fixes: duplicate key value violates unique constraint "website_signup_requests_pkey"
--
-- Run ONCE in Supabase -> SQL Editor.
-- This migration changes a legacy PRIMARY KEY(user_id) into PRIMARY KEY(user_id, role)
-- and removes any leftover UNIQUE(user_id) constraint/index.

BEGIN;

-- Safety check: role must already exist because the application stores
-- farmer/public/pdma in this column.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'website_signup_requests'
      AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'website_signup_requests.role does not exist. Stop: this migration expects a role column.';
  END IF;
END $$;

-- If the current primary key is ONLY user_id, remove it. This is the exact
-- legacy design that causes the duplicate-key error when the same Gmail/user
-- registers another role.
DO $$
DECLARE
  pk_name text;
  pk_cols text[];
BEGIN
  SELECT c.conname,
         array_agg(a.attname ORDER BY u.ord)
    INTO pk_name, pk_cols
  FROM pg_constraint c
  CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = u.attnum
  WHERE c.conrelid = 'public.website_signup_requests'::regclass
    AND c.contype = 'p'
  GROUP BY c.conname;

  IF pk_name IS NOT NULL AND pk_cols = ARRAY['user_id']::text[] THEN
    EXECUTE format(
      'ALTER TABLE public.website_signup_requests DROP CONSTRAINT %I',
      pk_name
    );
  END IF;
END $$;

-- Remove any non-primary UNIQUE(user_id) table constraint.
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
    EXECUTE format(
      'ALTER TABLE public.website_signup_requests DROP CONSTRAINT %I',
      c.conname
    );
  END LOOP;
END $$;

-- Remove standalone UNIQUE(user_id) indexes left by older migrations.
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
      AND (
        SELECT a.attname
        FROM pg_attribute a
        WHERE a.attrelid = tbl.oid
          AND a.attnum = (i.indkey::smallint[])[0]
      ) = 'user_id'
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
  END LOOP;
END $$;

-- A primary key cannot contain nulls. Existing AgriWatch rows should already
-- have a role, but fail clearly instead of silently changing legacy data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.website_signup_requests WHERE role IS NULL
  ) THEN
    RAISE EXCEPTION 'Some website_signup_requests rows have role = NULL. Set their correct role before running this migration.';
  END IF;
END $$;

ALTER TABLE public.website_signup_requests
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Add the correct composite primary key only if the table currently has none.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.website_signup_requests'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.website_signup_requests
      ADD CONSTRAINT website_signup_requests_pkey PRIMARY KEY (user_id, role);
  END IF;
END $$;

-- Also make the intended uniqueness explicit if another primary-key design is
-- ever introduced later. IF NOT EXISTS makes reruns safe.
CREATE UNIQUE INDEX IF NOT EXISTS website_signup_requests_user_role_uq
  ON public.website_signup_requests (user_id, role);

COMMIT;

-- Verification: same user_id may now appear once per role.
SELECT user_id, role, status, email, full_name
FROM public.website_signup_requests
ORDER BY user_id, role;
