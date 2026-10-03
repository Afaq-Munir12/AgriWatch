# AgriWatch — Signup UI + Fresh Login Fix

## What changed

### Fresh authentication / direct-login fix
- Added `src/utils/authAccess.js` for a tab-scoped portal access grant.
- Added `src/components/RequirePortalAuth.jsx` to protect Farmer, Public and PDMA routes.
- `Home.jsx` clears the portal grant when the user returns to the public landing page.
- `Login.jsx` no longer automatically redirects an old Supabase/Google session into a dashboard.
- Google login is explicitly marked as a new login attempt and requests Google account selection again.
- Successful approved login creates a fresh portal grant for the correct role.
- `useSupabaseAuth.signOut()` clears both portal access and pending login state.

Expected behavior:
1. Login as Farmer with Google.
2. Farmer dashboard opens.
3. Return to Home.
4. Click Login/Open Dashboard again.
5. The old session is not used to auto-enter Farmer portal; authentication is required again.

### Signup UI
- Added 3-step signup progress (Phone -> Verify -> Profile).
- Added trust/verification chips.
- Kept +92 Pakistan phone validation and 6-digit OTP validation.
- Updated Google Complete Profile page to use the same modern auth UI.
- Added stronger validation for names, tehsil, designation, field names and acreage.
- Redesigned verification document upload area.

## Replacement files
- src/App.jsx
- src/pages/Login.jsx
- src/pages/Signup.jsx
- src/pages/CompleteProfile.jsx
- src/pages/Home.jsx
- src/index.css
- src/supabase/useSupabaseAuth.js
- src/components/RequirePortalAuth.jsx (new)
- src/utils/authAccess.js (new)

## Build note
The source was prepared here, but `npm install` timed out in the execution environment, so run locally:

```bash
npm install
npm run dev
```

Then test Google login, logout/re-entry, phone OTP and all three portal routes.
