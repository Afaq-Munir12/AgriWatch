# Firebase personal website preview

Preview: https://agri-watch-4wj7m8bnb-afaq-munirs-projects.vercel.app/login

Status: preview deployed and artifact hashes verified. The user confirmed the normal website preview's OTP, stored-role routing, Settings counts and sign-out checks passed. Production promotion remains held pending real Admin/PDMA OAuth preview checks. No live login verification is claimed.

## Source and preservation

The isolated worktree is `C:/agriwatch_mobile/agriwatch-web/.firebase-personal-preview`, branch `integrate/firebase-personal-otp`, based on Afaq's latest `main` commit `6a87b435d202b8672e6b6da9ffee148c907bd0a7`. His new commits `d97fed8` and `6a87b43` were fetched and reviewed. The existing dirty rollout worktree was left intact. No Git push or merge was performed.

The latest commit reintroduced report demo fallbacks and older direct updates. The preview retains the deployed `8f480a5` report contract, service, review components and report pages, then adapts personal report reads to Firebase UID. This preserves the deployed report review behavior. No approval implementation, SQL file, database rule or report record was changed.

Farmer/Public use a separate Firebase Auth app and Supabase data client; staff retain the existing Supabase Auth client. The verified Firebase UID reads `user_profiles/{uid}`, `access_requests` filtered by `uid`, and Supabase `complaints` filtered by `firebase_uid`. No phone/email matching, legacy UUID lookup, automatic linking, merging, profile creation or role grant is performed. A single stored Farmer/Public membership selects its portal; both verified memberships allow a choice; neither shows setup. The current mobile profile schema has one `role` field, so no second membership store was invented.

The pre-login personal portal cards are hints only. They cannot grant a Firebase role. Admin and PDMA guards, their auth service, and access-request approval page are byte-equivalent after newline normalization to the selected source base.

## Test results

| Check | Result |
| --- | --- |
| Firebase identity/OTP/domain and personal session tests | 22 passed |
| Login UI, role guards, Admin/PDMA regression, personal sign-out component tests | 10 passed |
| Existing report compatibility and PDMA assignment contract tests | 4 passed |
| Production build including existing pages | Passed |
| New Firebase source lint | No errors; Fast Refresh warning |
| Repository lint | No errors; existing warnings remain |
| Patch whitespace validation | Passed |
| Vercel deployment | READY, target preview, `dpl_5eoep9MEMyAVRyF74qXDwRecH1aj` |
| Uploaded files against tested dist SHA-1 hashes | Passed for all 7 files |
| Firebase preview hostname | Authorized; only the exact new hostname added |
| Firebase production hostname `agri-watch-rho.vercel.app` | Already authorized; verified |
| All production aliases | Unchanged |
| Production login HTTP page | 200 with application root; authentication itself not tested |
| Downloaded deployed bundle in mocked DOM | Existing login layout, heading, logo and navigation links passed; standalone heading absent |
| Real OTP, stored-role routing, Settings and sign-out on this new preview | User confirmed passed |
| Admin/PDMA OAuth entry points and exact preview return allowlist | Passed: both authorize endpoints redirect to Google with expected provider callback |
| Staff-focused component and permission recheck | 6 passed |
| Real Admin/PDMA Google preview login | Pending: no connected browser or interactive staff account session |

Commands: `npm run test:personal`, `npm run test:personal-ui`, `node --test test/report-contract.test.mjs`, `npm run build`, `oxlint src`, `git diff --check`. Automated tests use fake OTP fixtures and do not send SMS or write records. The prior staging/mobile UID match passed. The stored account role is `citizen` (General Public), with a profile present, zero CMP reports and zero access requests. The user confirmed the expected role and counts on the normal website preview.

The earlier page headed "Farmer and public sign-in preview" was identified by the user's address-bar URL as `https://agri-watch-enqk71wc4-afaq-munirs-projects.vercel.app/staged-sign-in`, the older standalone test deployment. The new normal website preview uses `/login` and the heading "Access your AgriWatch account". Its downloaded, hash-matched bundle was rendered in a mocked DOM to verify the normal layout; this does not replace visual browser QA or real provider checks.

## Configuration and remaining limitations

Firebase Authorized Domains received only `agri-watch-4wj7m8bnb-afaq-munirs-projects.vercel.app`. Existing domains were preserved.

Supabase Google is enabled. Our earlier attempt to add the two preview URLs returned HTTP 403. The owner subsequently added them, and a read-only configuration check verified both exact URLs below, with the existing localhost entry and Site URL preserved:

- `https://agri-watch-4wj7m8bnb-afaq-munirs-projects.vercel.app/auth/callback`
- `https://agri-watch-4wj7m8bnb-afaq-munirs-projects.vercel.app/admin-portal`

Keep the Site URL `https://agri-watch-rho.vercel.app/` and providers unchanged. Supabase phone sign-in was already disabled; PDMA's retained phone path cannot be certified as working live. PDMA Google and Admin Google retain their existing permission checks. Production callback URLs were also absent from the allowlist; Afaq's new OAuth resume guard handles a Site URL fallback on the updated site, but a real staff login must still be checked before promotion.

Vercel's existing preview authentication protection redirects unauthenticated HTTP requests to Vercel login. It was not disabled. The Browser integration reported no available browser, so visual QA and real provider interactions remain pending.

This integration reads personal records only. Profile edits, setup, new CMP reports and software-issue submissions are directed to the mobile app. The website does not send Firebase UIDs into legacy UUID columns or claim that an offline example/local record was saved. Legacy Supabase farmer fields are not automatically attached to Firebase profiles; only fields actually present on the Firebase profile are used. The build has a bundle-size warning (approximately 523 KB gzip main JavaScript).

## User acceptance

1. Sign into Vercel if the preview protection prompts, then open the preview login URL.
2. Select Farmer and complete your real SMS OTP. Your previously stored General Public account should open `/public`, regardless of the selected hint.
3. Open Settings and check the stored role, profile existence, CMP count and access-request count. Read failures must show unavailable, never zero. The Download sign-in check button exports only UID, role/decision, read statuses and counts. It excludes phone, email, SMS code and tokens.
4. Sign out, confirm login is shown, and confirm `/public` does not restore dashboard access without a Firebase session. Retry OTP if needed.
5. After a Supabase owner adds the exact preview return URLs, test the Admin and PDMA Google paths and their permitted pages without approving requests, reviewing reports or submitting forms.

## Rollback and promotion

The current production deployment is `dpl_HBPPne8MJx8eTqePLVRyjufDbXAj` at `https://agri-watch-a3py73751-afaq-munirs-projects.vercel.app` and remains READY. All three production aliases are recorded in `.local/personal-website-rollback.json` in the mobile workspace. The preview payload, deployment state and all tested artifact hashes are retained separately in `.local/personal-website-preview-payload.json` and `.local/personal-website-preview.json`.

After actual preview acceptance, promote the exact verified deployment rather than rebuilding a different version, then perform a real live OTP/sign-out check. If live acceptance fails, roll back to `dpl_HBPPne8MJx8eTqePLVRyjufDbXAj`. Neither promotion nor rollback has been run. Vercel documents [promotion](https://vercel.com/docs/cli/promote) and [rollback](https://vercel.com/docs/cli/rollback); the saved deployment ID is the rollback target.

## Exact website files changed relative to Afaq's latest main

- `.gitignore`
- `FIREBASE_PERSONAL_PREVIEW_REVIEW.md`
- `package-lock.json`
- `package.json`
- `src/App.jsx`
- `src/components/PersonalAccountStatus.jsx`
- `src/components/ProfileDropdown.jsx`
- `src/components/ProfileEditor.jsx`
- `src/components/RequirePersonalAuth.jsx`
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
- `src/main.jsx`
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
