AgriWatch — Google OAuth + Public Portal ML Fix
=================================================

BASED ON:
update (3)(1).zip

REPLACE / ADD THESE FILES:
- src/App.jsx
- src/components/OAuthResumeGuard.jsx                 NEW
- src/pages/AuthCallback.jsx                         NEW
- src/pages/Login.jsx
- src/pages/Signup.jsx
- src/utils/authAccess.js
- src/services/droughtService.js
- src/pages/public/PublicHome.jsx
- src/pages/public/RegionalMap.jsx
- src/pages/public/PublicAlerts.jsx
- src/pages/public/Awareness.jsx

WHAT IS FIXED
-------------
1. Google login/signup callback race
   - OAuth now has one dedicated /auth/callback route.
   - OAuth intent is kept in both sessionStorage and localStorage for the
     short Google round-trip.
   - If Supabase falls back to Home or Login, OAuthResumeGuard recovers the
     in-progress Google login instead of leaving the user there.
   - Approved role -> correct portal.
   - Missing selected role -> Complete Profile.
   - Google signup -> Complete Profile.
   - Pending/rejected role -> clear status screen.

2. Public Portal now uses the real signed-in PUBLIC user's Supabase district.
   Removed hardcoded "Peshawar District" from:
   - Public Home
   - Regional Map
   - Public Alerts
   - Awareness & Tips

3. Public Portal no longer calls http://127.0.0.1:8000.
   It now uses src/services/droughtService.js:
   VITE_API_URL if set, otherwise:
   https://agri-watch-backend.vercel.app

4. District names are resolved against the real /districts endpoint so
   "Mansehra" and "Mansehra District" can match the ML backend safely.

SUPABASE DASHBOARD — IMPORTANT ONE-TIME SETTING
-----------------------------------------------
Authentication -> URL Configuration -> Redirect URLs

Add:
http://localhost:5173/auth/callback
https://agri-watch-rho.vercel.app/auth/callback

If you deploy on another Vercel/custom domain, add:
https://YOUR-DOMAIN/auth/callback

Also keep the normal Site URL set to your deployed frontend origin.

VERCEL
------
Recommended Environment Variable:
VITE_API_URL=https://agri-watch-backend.vercel.app

After replacing files:
npm run dev

Test Google LOGIN:
Farmer -> Continue with Google -> select account -> /farmer
Public -> Continue with Google -> select account -> /public
PDMA -> Continue with Google -> select account -> /pdma

Test Google SIGNUP:
Choose role -> Continue with Google -> select account -> Complete Profile

Test Public:
Log in as General Public with a saved district such as Mansehra District.
Home, Regional Map, Alerts and Awareness must all use that user's district.
