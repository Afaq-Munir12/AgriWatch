AgriWatch MAIN — Google Callback Repair (2026-10-12)

Source: previous AgriWatch_MAIN_Complete_One_ENV.zip, with only Google OAuth callback handling corrected.
Changes:
  src/pages/AuthCallback.jsx
     Handles returned #access_token / #refresh_token tokens by asking Supabase to establish the session.
     Continues to handle SDK-established OAuth sessions and ?code= callbacks.
     Removes OAuth credentials from the URL after successful sign-in.
     Preserves all existing role approval checks and routing.
  src/components/OAuthResumeGuard.jsx
     Preserves URL hash if OAuth redirects to the home page rather than /auth/callback.

NO CHANGES to Firebase OTP code, Supabase schema, Edge Function, ML backend, or Vercel settings.
This ZIP includes one .env containing public browser configuration. Do not commit .env to GitHub.
Do not share screenshots containing #access_token or #refresh_token.

LOCAL TEST:
1. Extract ZIP to a fresh folder and open it in VS Code.
2. npm install
3. npm run dev
4. Open localhost:5173/login, select the role and Continue with Google.
5. Main Supabase Auth Redirect URLs must include http://localhost:5173/auth/callback
6. If another app is using port 5173, stop it first.
7. Keep the Main Edge Function AGRIWATCH_PHONE_BRIDGE_MODE=disabled.

DEPLOY ONLY AFTER LOCAL GOOGLE SIGN-IN, EMAIL LOGIN AND ROLE ROUTING WORK.
Vercel environment variables must be entered in project settings; local .env is not automatically uploaded.
