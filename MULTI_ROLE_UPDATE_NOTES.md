# AgriWatch multi-role auth + signup UI update

- Added **Continue with Google** to Signup.
- Login now respects the selected role after Google OAuth.
- Same Gmail can have separate Farmer, Public and PDMA registrations.
- Profile/dashboard queries are scoped to the active role so Public data does not appear in PDMA.
- Signup and Complete Profile use the same centered width/proportions as Login.

## Required
Run `SUPABASE_MULTI_ROLE_SETUP.sql` once in Supabase SQL Editor before testing multiple roles on the same Gmail.


## v4 schema compatibility fix
- Fixed PDMA/Farmer/Public Google profile completion on existing `website_signup_requests` tables that do not have an `id` column.
- Role lookup now uses the real composite identity: `user_id + role`.
- Admin approval/rejection now updates only the selected role for a multi-role Gmail account, rather than every role belonging to that user.
- No `id` column is required for website signup requests.
