# Complaints & Software Issue Reports — setup notes

## 1. Run the SQL (one time)

Supabase Dashboard → **SQL Editor** → New query → paste `complaints_setup.sql` → **Run**.

It creates:

| Object | Purpose |
| --- | --- |
| `public.complaints` | Field complaints from farmers and the general public |
| `public.issue_reports` | "The software is broken" reports from farmers, public users and PDMA officers |
| realtime publication | So a new complaint appears on the PDMA / Admin portal without a refresh |
| RLS policies | Open by default so the project demos cleanly (see below) |
| `complaint-photos` bucket | Public storage bucket for photos and screenshots |

The script is safe to run more than once.

## 2. Environment variables

Nothing new. It reuses the existing `.env` at the project root:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## 3. Who can do what

| Portal | Route | What it does |
| --- | --- | --- |
| Farmer | `/farmer/complaints` | File a damage complaint → `complaints` |
| Farmer | `/farmer/report-issue` | Report a software glitch → `issue_reports` |
| Public | `/public/complaint` | File a drought / water-shortage report → `complaints` |
| Public | `/public/report-issue` | Report a software glitch → `issue_reports` |
| PDMA officer | `/pdma/complaints` | Review, forward and resolve complaints |
| PDMA officer | `/pdma/report-issue` | Report a software glitch to the admin |
| Admin portal | `/admin-portal/complaints` | Oversight of every complaint, all districts |
| Admin portal | `/admin-portal/issues` | Triage software issues, reply to the reporter |

A reply written by a PDMA officer or an admin is stored in `resolution_note` /
`admin_note` and shown back to the person who filed the report.

## 4. Status values

* Complaints: `Under Review` → `Forwarded` → `Resolved`
* Issues: `Open` → `In Progress` → `Resolved` / `Closed`
* Issue severity: `Low`, `Medium`, `High`, `Critical`

These strings are defined once in `src/supabase/complaintsApi.js`; change them
there and in the SQL defaults if you want different wording.

## 5. Offline behaviour

If Supabase can't be reached — missing keys, tables not created, no internet
during a demo — the app falls back to `localStorage` and shows an amber banner
saying the data is local only. Nothing crashes, so a live demo still works.
Photos behave the same way: storage bucket first, inline data URL as a fallback.

## 6. Security note for the report

The RLS policies shipped here allow **anyone** (including a signed-out visitor)
to insert, read and update rows. That is intentional for a demo, but it is not
production-safe: any visitor could read another farmer's complaint or change a
status. The bottom of `complaints_setup.sql` has a commented **STRICTER** block
that restricts reads to the row owner plus `admin` / `pdma` roles from
`user_profiles`, and restricts updates to staff only. Swap it in once every
portal requires a login — this is a good "limitations / future work" point.

## 7. Files added

```
supabase/complaints_setup.sql          SQL schema, RLS, storage bucket
src/supabase/complaintsApi.js          All Supabase reads/writes + row mapping
src/supabase/useCurrentProfile.js      Resolves the signed-in user for the forms
src/store/IssueReportsContext.jsx      Software issue state (realtime)
src/store/ComplaintsContext.jsx        Rewritten: Supabase instead of localStorage
src/components/OfflineNotice.jsx       Amber "not connected" banner
src/pages/shared/ReportIssue.jsx       Shared issue form (farmer / public / PDMA)
src/pages/public/PublicComplaint.jsx   Public complaint form
src/pages/adminportal/AdminPortalComplaints.jsx
src/pages/adminportal/AdminPortalIssues.jsx
```
