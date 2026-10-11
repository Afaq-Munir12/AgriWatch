-- Main production phone protection: ADDITIVE, read-only lookup helper.
-- Execute ONLY in ORIGINAL AgriWatch Main SQL Editor AFTER reviewing the
-- production schema. Does not update records or disable RLS.
-- Callable only by service_role (Supabase Edge Function). Fail closed in Edge
-- Function if missing. Ignore unverified phone metadata only at your peril:
-- here we reject any existing match to avoid accidental duplicate accounts.
BEGIN;
CREATE OR REPLACE FUNCTION public.agriwatch_phone_claim_conflict(
  p_phone text,
  p_owner uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  digits text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  local_number text;
BEGIN
  -- Only canonical E.164 PK mobile numbers come from verified Firebase claims.
  IF digits !~ '^923[0-9]{9}$' THEN RETURN true; END IF;
  local_number := right(digits, 10);

  -- The registration table can contain national/E.164/spaced numbers.
  IF EXISTS (
    SELECT 1 FROM public.website_signup_requests AS s
    WHERE s.phone IS NOT NULL
      AND right(regexp_replace(s.phone, '[^0-9]', '', 'g'), 10) = local_number
      AND (p_owner IS NULL OR s.user_id <> p_owner)
  ) THEN RETURN true; END IF;

  -- Current Supabase Auth phone and older user-supplied phone metadata.
  -- Metadata is not proof of ownership, but conservatively blocks duplicates.
  IF EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE (p_owner IS NULL OR u.id <> p_owner)
      AND (
        right(regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g'), 10) = local_number
        OR right(regexp_replace(coalesce(u.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g'), 10) = local_number
        OR right(regexp_replace(coalesce(u.raw_user_meta_data ->> 'phone_number', ''), '[^0-9]', '', 'g'), 10) = local_number
      )
  ) THEN RETURN true; END IF;
  RETURN false;
END;
$fn$;

REVOKE ALL ON FUNCTION public.agriwatch_phone_claim_conflict(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agriwatch_phone_claim_conflict(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.agriwatch_phone_claim_conflict(text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.agriwatch_phone_claim_conflict(text, uuid) TO service_role;
COMMIT;

-- Expected: one row. No data was changed.
SELECT proname AS function_name, prosecdef AS security_definer
FROM pg_proc WHERE oid = 'public.agriwatch_phone_claim_conflict(text, uuid)'::regprocedure;
