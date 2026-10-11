-- Additive Firebase phone <-> Supabase Auth UUID bridge. Does NOT alter any existing table.
-- Run once in the Supabase SQL Editor BEFORE deploying phone-auth-bridge.
CREATE TABLE IF NOT EXISTS public.firebase_phone_links (
  firebase_uid text PRIMARY KEY,
  supabase_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL UNIQUE CHECK (phone ~ '^\+923[0-9]{9}$'),
  last_recovery_auth_time bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- All reads/writes to phone links go through the trusted Edge Function using service_role.
ALTER TABLE public.firebase_phone_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.firebase_phone_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.firebase_phone_links TO service_role;

-- Atomically mark a *fresh phone sign-in* as consumed for password recovery.
-- Freshness is independently checked against the signed Firebase auth_time in the function.
CREATE OR REPLACE FUNCTION public.consume_phone_recovery(
  p_firebase_uid text,
  p_supabase_user_id uuid,
  p_auth_time bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.firebase_phone_links
     SET last_recovery_auth_time = p_auth_time,
         updated_at = now()
   WHERE firebase_uid = p_firebase_uid
     AND supabase_user_id = p_supabase_user_id
     AND p_auth_time > last_recovery_auth_time;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_phone_recovery(text,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_phone_recovery(text,uuid,bigint) TO service_role;
