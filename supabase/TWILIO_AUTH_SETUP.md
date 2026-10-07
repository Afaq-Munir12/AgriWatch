# AgriWatch Phone OTP (Supabase + Twilio)

The upgraded Login and Signup pages now use **real Supabase Phone Auth**:

- `supabase.auth.signInWithOtp({ phone })` sends the SMS OTP.
- `supabase.auth.verifyOtp({ phone, token, type: "sms" })` verifies the code and creates the authenticated session.
- Pakistani numbers are normalized to E.164 as `+92XXXXXXXXXX`.
- The UI accepts only 10 local digits after the fixed `+92` prefix and requires the number to begin with `3`.

## Twilio configuration

Do **not** put the Twilio Auth Token in Vite/React code. Browser variables are public.

In the Supabase dashboard for this project:

1. Open **Authentication -> Providers -> Phone**.
2. Enable Phone authentication.
3. Select/configure **Twilio** as the SMS provider.
4. Enter the Twilio Account SID.
5. Enter the Twilio Auth Token.
6. Enter the Twilio Messaging Service SID / configured sender required by your Supabase project.
7. Save the provider settings.
8. Make sure Pakistan (`+92`) is permitted by the Twilio geo permissions / messaging configuration used by the project.

After this dashboard configuration, the included Login/Signup code sends and verifies real OTPs; no Twilio secret is exposed to the browser.

## Existing frontend environment

Keep these in your local `.env` / Vercel project environment settings:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Important database note

Phone signup writes a row to `website_signup_requests` after OTP verification. The current flow sets:

- `public` -> `approved` and opens the public dashboard.
- `farmer` -> `pending` for admin approval.
- `pdma` -> `pending` for admin approval.

Your Supabase RLS policy must allow an authenticated user to insert/upsert their own `website_signup_requests` row (`user_id = auth.uid()`).
