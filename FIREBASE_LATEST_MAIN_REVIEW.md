# Latest main Firebase integration review

Branch: `integrate/firebase-latest-main`, isolated worktree `C:/agriwatch_mobile/agriwatch-web/.firebase-latest-main`.
Afaq main: `b244abcaf2414aaf4bdc617a988c593cd8deff37` (`b244abc`, one new commit after the earlier tested base).
Previously tested production Firebase authentication source: `2e02481ad3a3907c380465971c7be319d4327cc3`, previously deployed as `dpl_G2eDqSTco72E4LHRbo94431Q8W1P`. A read-only current check found the live site now serves Afaq main `b244abc` from `dpl_98bqvPiCwt7d7XP9zDv66dsRDuku`, with asset `/assets/index-DfvpXq6E.js`. Its bundle contains the new credential-login copy, including "OTP is no longer the first login screen", and does not contain the tested stored Firebase role hint. All three live aliases point to Afaq's new deployment. This integration did not make that production change.

## Afaq's new work

The commit changes 32 files. It adds extensive Urdu translations and local RTL layout to Farmer/Public pages, alerts, crop guidance, maps and report forms; updates language interpolation; adds crop/farm-size localization helpers; changes regular login to credential/password controls with a QR placeholder; revises signup; adds Supabase backup-password controls; and improves Admin Google account selection/callback recovery. The QR panel is a placeholder, not a working mobile authentication bridge. The commit title mentions ML backend integration, but the new diff mostly concerns localization and authentication.

## Integration and conflicts

Six content conflicts were resolved by reviewing individual hunks:

- `src/components/ProfileDropdown.jsx`
- `src/pages/Login.jsx`
- `src/pages/farmer/FarmerComplaints.jsx`
- `src/pages/public/CommunityReports.jsx`
- `src/pages/public/PublicComplaint.jsx`
- `src/pages/shared/ReportIssue.jsx`

Login retains Afaq's layout, theme/language controls, role cards, QR placeholder and staff credential form. Farmer/Public use the tested Firebase OTP handlers and stored UID role routing. Selecting a role cancels a pending verification; selection never creates membership. PDMA retains Google and its original phone OTP path, plus Afaq's credential login checked against approved stored PDMA registration. Admin retains Afaq's new forced Google account selection and dedicated callback branch. All personal/staff permission guards and the approval page remain identical to the previously tested Firebase release and latest-main guard/approval sources.

Report pages retain Afaq's translated text, RTL and visual changes while keeping live UID ownership filters, read-only submission controls and actual recorded-status/response logic. The live drought category contract is retained instead of substituting historic damage categories. No report records or approvals were modified.

The backup-password feature is excluded: its modal and profile-completion write use `supabase.auth.updateUser`, which does not set a password on the verified Firebase account. No same-Firebase-UID recovery implementation or passed recovery tests exist. The modal, menu trigger, completion requirement and OAuth flag are removed. Afaq's separate legacy credential signup and PDMA credential login remain his work; they do not merge or provision Farmer/Public Firebase membership. Personal account setup and edits remain mobile-app workflows.

20 of Afaq's changed files are byte-equivalent after newline normalization to latest main. All 13 Firebase modules, three role guards, Admin access requests and auth-access storage are unchanged from the previously tested Firebase release.

## Verification

- 22 Firebase identity/session tests passed.
- 16 login/UI/permission tests passed, including actual Urdu strings, cancellation of pending OTP, Admin Google account selection and callback routing, PDMA credentials, and usable profile completion without a backup password.
- 4 existing report-contract tests passed. Total: 42 automated tests.
- Final production build passed. Main bundle is approximately 543 KB gzip, with the existing size warning.
- Focused lint passed without errors or undefined component warnings; two pre-existing ProfileDropdown effect warnings remain.
- Whitespace and unresolved-conflict checks passed. Afaq latest main and the current live deployment were compared using read-only source/API/public artifact checks.
- Preview/provider round trips were user-confirmed for the released source. This newly merged build has not been deployed or checked with real SMS or Google accounts; component tests use mocks.
- No SQL, database migrations, report writes, approval changes, Git push or deployment was performed for this integration.
- Existing bundle-size and React effect lint warnings may remain.

## Exact files changed relative to latest Afaq main

- `.gitignore`
- `FIREBASE_LATEST_MAIN_REVIEW.md`
- `FIREBASE_PERSONAL_PREVIEW_REVIEW.md`
- `package-lock.json`
- `package.json`
- `src/App.jsx`
- `src/components/PersonalAccountStatus.jsx`
- `src/components/ProfileDropdown.jsx`
- `src/components/ProfileEditor.jsx`
- `src/components/RequirePersonalAuth.jsx`
- `src/components/SecurityPasswordModal.jsx`
- `src/firebase/PersonalAuthContext.jsx`
- `src/firebase/dataClient.js`
- `src/firebase/identityService.js`
- `src/firebase/phoneSite.js`
- `src/firebase/profile.js`
- `src/firebase/projectIdentity.js`
- `src/firebase/reports.js`
- `src/firebase/roleRouting.js`
- `src/firebase/runtime.js`
- `src/firebase/session.js`
- `src/hooks/useMyProfile.js`
- `src/i18n/translations.js`
- `src/main.jsx`
- `src/pages/AuthCallback.jsx`
- `src/pages/CompleteProfile.jsx`
- `src/pages/Login.jsx`
- `src/pages/PersonalAccount.jsx`
- `src/pages/admin/Complaints.jsx`
- `src/pages/adminportal/AdminPortalComplaints.jsx`
- `src/pages/farmer/FarmerComplaints.jsx`
- `src/pages/farmer/FarmerSettings.jsx`
- `src/pages/public/CommunityReports.jsx`
- `src/pages/public/PublicComplaint.jsx`
- `src/pages/public/PublicSettings.jsx`
- `src/pages/shared/ReportIssue.jsx`
- `src/services/farmerFieldService.js`
- `src/store/ComplaintsContext.jsx`
- `src/store/IssueReportsContext.jsx`
- `src/supabase/complaintsApi.js`
- `src/supabase/useCurrentProfile.js`
- `test/firebase-identity.test.mjs`
- `test/personal-session.test.mjs`
- `test/personal-ui.test.jsx`
- `vitest.config.js`

## Source files differing from the previously tested Firebase release

- `src/components/LanguageToggle.jsx`
- `src/components/NotificationDropdown.jsx`
- `src/components/OAuthResumeGuard.jsx`
- `src/components/ProfileDropdown.jsx`
- `src/components/Sidebar.jsx`
- `src/i18n/LanguageContext.jsx`
- `src/i18n/translations.js`
- `src/index.css`
- `src/pages/AuthCallback.jsx`
- `src/pages/CompleteProfile.jsx`
- `src/pages/CropCalendar.jsx`
- `src/pages/Login.jsx`
- `src/pages/Signup.jsx`
- `src/pages/adminportal/AdminPortalLogin.jsx`
- `src/pages/farmer/CropRecommendations.jsx`
- `src/pages/farmer/FarmerAlerts.jsx`
- `src/pages/farmer/FarmerComplaints.jsx`
- `src/pages/farmer/FarmerHome.jsx`
- `src/pages/farmer/FarmerSettings.jsx`
- `src/pages/farmer/IrrigationScheduler.jsx`
- `src/pages/farmer/YieldRisk.jsx`
- `src/pages/public/Awareness.jsx`
- `src/pages/public/CommunityReports.jsx`
- `src/pages/public/PublicAlerts.jsx`
- `src/pages/public/PublicComplaint.jsx`
- `src/pages/public/PublicHome.jsx`
- `src/pages/public/PublicSettings.jsx`
- `src/pages/public/RegionalMap.jsx`
- `src/pages/shared/ReportIssue.jsx`
- `src/supabase/useSupabaseAuth.js`
- `src/utils/localizeAgriculture.js`
