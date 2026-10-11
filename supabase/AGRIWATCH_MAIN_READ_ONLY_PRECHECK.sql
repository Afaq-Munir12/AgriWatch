-- Read-only audit for AgriWatch MAIN. Does not create or modify anything.
-- DO NOT paste secrets or real user information into public chats.
SELECT policyname, cmd, roles, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='website_signup_requests'
  AND cmd = 'INSERT';

SELECT count(*) AS existing_auth_users FROM auth.users;
SELECT role, status, count(*) AS requests
FROM public.website_signup_requests
GROUP BY role, status ORDER BY role, status;

-- Duplicate phone claims in registration rows (do not share these numbers).
SELECT count(*) AS phones_claimed_by_multiple_users
FROM (
 SELECT right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) AS suffix
 FROM public.website_signup_requests
 WHERE length(regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')) >= 10
 GROUP BY 1 HAVING count(DISTINCT user_id) > 1
) q;

-- If this policy has not yet been corrected, run the reviewed approval patch
-- separately, after retaining a copy of its prior definition.
