# AgriWatch — General Public signup update

This ZIP starts from the user's uploaded working `up (4).zip`.

## Changed (only two application files)
- `src/pages/Signup.jsx`: General Public uses existing Google or email/password identity; the Public profile now asks for **full name, district, and contact phone number**. Contact phone is validated as a Pakistani mobile number and saved as `+92...`. It does **not** run Firebase SMS/OTP for Public registration. Language can still be changed after signup.
- `src/pages/CompleteProfile.jsx`: Google Public signup no longer asks for a verification document or a separate backup password. Public documents are never uploaded. Submission saves an approved `public` entry in `website_signup_requests` and navigates to `/public`.

## Unchanged
- Google OAuth callback/session repair, login pages and existing email/password login.
- Farmer and NDMA document requirements and pending-approval workflows.
- Firebase phone OTP code for the other registration methods (not activated or repaired by this update).
- Supabase project configuration, Edge Functions, RLS SQL scripts, FastAPI ML backend.

## Important authentication distinction
Name, district and phone alone are **profile details**, not a secure login mechanism. Public still needs **Google sign-in** or an **email/password Supabase account** (which may require email confirmation, depending on Supabase Auth settings). The Public contact phone is **unverified** and should never be used alone for authentication or account linking.

## Setup/test
1. Keep your existing local `.env` / `.env.local` (not in the uploaded ZIP) and your current Vercel environment variables. Do not replace them with Staging values.
2. `npm install` and `npm run dev` to test the complete Public Google signup + form + Public dashboard.
3. `npm run build` before pushing to the existing GitHub/Vercel project.
4. In Main Supabase verify `website_signup_requests` has a row for the signed-in UUID with `role='public'`, `status='approved'`, `documents=[]`, and its contact `phone` + `district`.
5. If testing email signup, confirm the email first when required, then enter the same three Public profile fields.

No SQL migration is required for the current schema shown earlier in the conversation; its Public role insert policy already permits `approved` for the signed-in UUID. Live Supabase execution has not been performed here.
