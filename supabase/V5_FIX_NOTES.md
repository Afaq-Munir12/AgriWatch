# AgriWatch Auth Multi-Role v5

## Database fix
The error `duplicate key value violates unique constraint "website_signup_requests_pkey"` proves the legacy primary key is still based on `user_id` alone. Previous SQL removed ordinary UNIQUE constraints but intentionally left the primary key unchanged.

Run `SUPABASE_MULTI_ROLE_PKEY_FIX.sql` once in Supabase SQL Editor. It changes the legacy primary key from `user_id` to `(user_id, role)` when applicable and removes leftover UNIQUE(user_id) indexes/constraints.

After the migration, one auth identity can have:
- `(same-user-id, farmer)`
- `(same-user-id, public)`
- `(same-user-id, pdma)`

but cannot duplicate the same role twice.

## UI sizing fix
Login, Signup, and Google Complete Profile now use one shared desktop geometry:
- equal 50/50 columns
- equal left and right card width
- equal card height
- login content is vertically centered
- long Signup/Profile forms scroll inside the right card instead of making the page/card taller
- mobile remains natural-height and responsive
