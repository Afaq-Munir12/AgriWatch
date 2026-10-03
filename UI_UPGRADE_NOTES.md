# AgriWatch UI / Authentication Upgrade

## Updated in this package

### Home page
- Redesigned landing page with modern GeoAI visual language.
- Animated hero, satellite monitoring card, map pulses, floating status chips, gradient accents, data-source strip, richer role cards and hover motion.
- Responsive desktop/mobile behavior.
- Existing English/Urdu, theme toggle, guest access and login routes kept.

### Login
- Modern split-screen authentication design.
- Pakistani flag + fixed `+92` prefix.
- Only numeric phone input is accepted.
- Exactly 10 digits are accepted after `+92`.
- Number must begin with `3`.
- Numeric-only 6-digit OTP input.
- Real Supabase Phone Auth calls added (`signInWithOtp` + `verifyOtp`).
- Google login kept.
- Account request state is checked after authentication before routing.
- Better loading, error, pending and rejected states.

### Signup
- Same +92 Pakistani phone validation.
- Real SMS OTP verification before profile data is submitted.
- Full-name field blocks numbers/symbols that are not valid name punctuation.
- Tehsil/designation fields are sanitized as text fields.
- Acreage accepts positive numeric decimal input only.
- Farmer multiple-field flow is preserved.
- Phone signup writes to `website_signup_requests` and farmer fields are persisted through the existing service.
- Public signup is approved immediately in this flow; Farmer/PDMA requests remain pending for approval.

### Google complete-profile flow
- Full name validation added.
- Pakistani +92 phone input and numeric restriction added.
- Stored phone is normalized to E.164 (`+92XXXXXXXXXX`).

### Dashboards
- Shared cards now have subtle elevation/hover motion.
- Shared top bar has improved glass/backdrop treatment.
- Shared sidebars have a richer gradient and navigation motion.
- PDMA, Farmer, Public and Admin Portal layouts use the common polished dashboard shell.
- Motion automatically respects `prefers-reduced-motion`.

### API deployment quality
- Drought API now uses `VITE_API_URL` with the deployed AgriWatch backend as fallback instead of always forcing localhost.
- Guest dashboard uses the same configurable API URL.

## Twilio note
The frontend is now wired for real phone OTP through Supabase Auth. To actually send SMS, configure Twilio in Supabase Authentication > Providers > Phone. See `TWILIO_AUTH_SETUP.md`.

Never put a Twilio Auth Token in Vite/browser environment variables.

## October 3 — Home hero + Farmer Portal polish
- Home hero now fits the first viewport more cleanly instead of extending far below the fold.
- Replaced the generic monitoring panel with a stylized Pakistan map and animated GeoAI scanning beam.
- Added pulsing province/city scan nodes, radar rings, satellite drift, live state and layer readouts.
- Upgraded Farmer Home with a severity-responsive hero, live ML probability gauge, animated environmental metrics, improved trend chart and alert card.
- Added farmer quick actions for Crop Recommendations, Irrigation, Crop Calendar and Complaints.
- All added animations respect `prefers-reduced-motion`.
