# Development Plan & Task Tracker
## Employee / Branch Management System

Reference: see [PRD.md](PRD.md) for full requirements.

This document breaks the MVP into sequential milestones. Each milestone should be merged to `master` (or a release branch) only once its tasks are checked off and the app builds/runs without errors. Check off tasks (`[x]`) as they are completed; add notes inline where useful (e.g., decisions, deviations from PRD).

**Status legend:** `[ ]` Not started · `[~]` In progress · `[x]` Done

---

## Milestone 0 — Project Setup & Infrastructure

Goal: a running, deployable skeleton with no business logic yet.

- [x] Scaffold React + Vite + TypeScript app (`npm create vite@latest . -- --template react-ts`)
- [x] Install and configure ESLint + Prettier
- [x] Set up folder structure (`src/features`, `src/components`, `src/lib`, `src/pages`, `src/types`)
- [x] Install UI library (MUI or Chakra UI) with RTL plugin — used MUI + `stylis-plugin-rtl`, direction-aware theme/cache in `App.tsx`
- [x] Install i18next + react-i18next, configure `he`/`en` locale files, RTL/LTR direction switch
- [x] Create Supabase project (dev environment) — `react-demo-dev` (ref `chwdwpowwwmxpgqeddhc`, region `eu-central-1`)
- [x] Install `@supabase/supabase-js`, set up Supabase client singleton with env vars (`.env.local`, never committed)
- [x] Configure GitHub repo: PR template added; branch protection on `master` requires the `build` CI check to pass
- [x] Set up Vercel project linked to GitHub repo — project created and env vars set; GitHub auto-deploy connection requires a one-time manual approval in the Vercel dashboard (CLI can't complete OAuth app installation non-interactively)
- [x] Add basic CI (lint + typecheck + build) via GitHub Actions
- [x] Commit: "Scaffold Vite + React + TS project with base tooling"

**Exit criteria:** `npm run dev` runs locally, `npm run build` succeeds, Vercel preview deploy works, Supabase client connects.

---

## Milestone 1 — Database Schema & Auth Foundation

Goal: schema, RLS policies, and login working end-to-end.

- [x] Design and create core tables in Supabase: `organizations`, `branches`, `employees`, `salary_profiles` — also added `employee_branch_assignments` (multi-branch support, PRD FR-5) in migration `20260620204635_init_schema.sql`
- [x] Create `profiles` table linked to `auth.users` (role: admin / branch_manager / employee, linked employee_id) — role lives on `profiles`; `employees.user_id` links back to it. New signups default to `employee` via the `handle_new_user` trigger.
- [x] Write RLS policies for `branches` and `employees` (admin: full access; branch_manager: own branch only; employee: self only) — implemented via `is_admin()`/`managed_branch_ids()`/`member_branch_ids()`/`current_employee_id()` SECURITY DEFINER helper functions; also added baseline RLS for `organizations` and `salary_profiles` ahead of schedule (admin-only / branch-manager-read, refined further in Milestone 4)
- [x] Set up Supabase Auth (email/password) — sign in / sign out flows in the frontend
- [x] Build route guard / auth context (`useAuth` hook, protected routes by role) — `AuthProvider` + `useAuth` + `ProtectedRoute` (supports `allowedRoles`)
- [x] Build basic login page (i18n-aware, RTL/LTR)
- [x] Seed script: create one admin user + sample branch for local dev/testing — `npm run seed` creates an admin, a branch_manager (scoped to "Main Branch"), and an employee (in "Second Branch") for RLS testing
- [x] Commit: "Add core schema, RLS policies, and authentication"

**Verification:** `npm run verify-rls` signs in as the seeded branch_manager and employee accounts and asserts they only see their own branch/employee data — all checks pass. End-to-end browser test (login → dashboard shows email/role → language toggle switches RTL/LTR → logout) verified manually via Playwright, no console errors.

**Exit criteria:** A seeded admin user can log in; RLS verified manually (a branch_manager test user cannot query another branch's data via the Supabase client).

---

## Milestone 2 — Branch & Employee Management (CRUD)

Goal: Admin/Branch Manager can manage branches and employees through the UI.

- [x] Branch list page (Admin) — table with create/edit/deactivate
- [x] Branch create/edit form (name, address, phone, manager assignment)
- [x] Employee list page — filterable by branch, role, active status
- [x] Employee create/edit form (personal info, start/end date, role, primary branch) — role is shown/editable only once the employee has a linked login account (`profiles.role`); creating that login account is the **"Invite to system"** flow added post-MVP-Milestone-7 (see note below) — out of scope when this milestone was originally built
- [x] Multi-branch assignment UI (`EmployeeBranchAssignment`) — assign employee to additional branches
- [x] Employee self-service profile page (read-only personal info + pay summary placeholder)
- [x] Soft-deactivation flow (set `end_date`, hide from active lists, retain historical data) — also supports reactivation
- [x] RLS coverage tests for branch/employee CRUD (manual or scripted) — extended `npm run verify-rls` with write-side checks (branch_manager blocked from creating branches/foreign-branch employees, allowed within own branch; employee blocked from any employee inserts)
- [x] Commit: "Add branch and employee CRUD management"

**Exit criteria:** Admin can create a branch, assign a manager, create employees, and assign them to branches; Branch Manager sees only their branch's employees. ✅ Verified via `npm run verify-rls` (8/8 checks pass) and an end-to-end Playwright pass driving all three seeded roles through the real UI (branch/employee create, deactivate, filter, nav visibility by role, cross-branch isolation).

**Bug found & fixed during verification:** React Query cached server data by query key only, not by user — switching users in the same tab (sign out, sign in as someone else) could briefly show the previous user's cached rows before refetching. Fixed by clearing the query cache whenever the authenticated user id changes (`AuthContext.tsx`).

---

## Milestone 3 — Attendance & Shift Scheduling

Goal: employees can clock in/out, managers can build schedules, attendance approval workflow works.

- [x] `attendance_records` table + RLS (employee: own records; branch_manager: own branch; admin: all)
- [x] Clock-in / clock-out UI (button + server-side timestamp via Supabase RPC/Edge Function, optional geolocation capture with consent prompt) — clock-in uses the `clock_in` column's DB default (`now()`); clock-out uses a `clock_out_attendance` SQL RPC (SECURITY INVOKER, so RLS still applies) so neither timestamp trusts the client clock; geolocation uses a best-effort `getCurrentPositionSafe()` helper that resolves to `null` on denial/timeout rather than blocking
- [x] Manual attendance entry form (Branch Manager) with mandatory note, status = `pending`
- [x] Attendance approval queue page (Branch Manager/Admin) — approve/reject pending entries
- [x] `shifts` table + RLS (branch-scoped)
- [x] Shift scheduling UI — implemented as a week-navigable table (prev/next week + branch filter) rather than a full calendar grid, to keep scope reasonable for MVP; create/assign/publish/cancel/delete all work
- [x] Employee "My Shifts" read-only view — shown as a section on the same `/shifts` page (upcoming, non-cancelled shifts assigned to the current user)
- [x] Conflict detection: flag overlapping shifts for the same employee across branches — non-blocking warning `Alert` in the shift dialog, checked against `published`/`completed` shifts only (drafts don't count as real conflicts)
- [x] Commit: "Add attendance tracking, approval workflow, and shift scheduling"

**Exit criteria:** An employee can clock in/out; a manager can approve it; a manager can build and publish a weekly schedule; an employee sees their upcoming shifts. ✅ Verified end-to-end via Playwright (employee clock-in/out → approved history; manager manual entry → approval queue → approve; shift creation → publish → overlap warning on a second conflicting shift; branch-scoped employee dropdown in the shift form). `npm run verify-rls` extended with 7 more checks (15/15 pass) covering attendance/shift read+write scoping for all three roles.

---

## Milestone 4 — Salary Profiles & Payroll Engine

Goal: automatic, legally-compliant overtime calculation and a working monthly payroll run.

- [x] `salary_profiles` table (versioned by `effective_from`/`effective_to`) + RLS (admin write, branch_manager read-only, employee: own only) — table + RLS already existed from Milestone 1 and matched this requirement exactly; no migration changes needed
- [x] Salary profile management UI (Admin) — set pay type, base rate, overtime eligibility — embedded as a "Salary" section in the employee edit dialog (`EmployeeSalarySection`); saving versions the profile (closes the prior open-ended row, inserts a new one from today) rather than mutating history
- [x] `salary_adjustments` table (bonus/deduction/addition) + UI for Admin/Branch Manager to add entries — same section, scoped by RLS to the manager's branch
- [x] Configurable overtime policy table (daily/weekly thresholds, 125%/150% rates, weekend/holiday rate) — Admin-editable settings page — single-row `overtime_policies` table, edited via `OvertimePolicySettings` at the top of the Payroll page
- [x] Supabase Edge Function: overtime calculation logic (regular vs. 125% vs. 150% vs. weekend/holiday hours) operating on approved attendance records — `calculate-payroll` deployed and verified live (Docker isn't available in this environment, but `supabase functions deploy` bundles/deploys remotely without it)
- [x] Supabase Edge Function: monthly payroll aggregation (`payroll_runs` + `payroll_lines`) combining hours + adjustments — same function; admin-only (checks caller's role via their own JWT before using the service-role key for cross-employee writes)
- [x] Payroll run trigger UI (Admin) — select month/branch, run calculation, review draft results
- [x] Payroll finalize/lock flow (status `draft` → `finalized`, blocks further edits unless reopened with audit note) — reopening prompts for a note stored in `payroll_runs.audit_note`
- [x] PDF generation for per-employee salary summary (client-side or Edge Function), stored in Supabase Storage — client-side via `@react-pdf/renderer`, uploaded to the private `payroll-pdfs` bucket (path `payroll/<employee_id>/<run_id>.pdf`, RLS-scoped like other employee data); PDF explicitly labeled "not an official payslip" per PRD §8 risk #1
- [x] Employee view: "My Pay" page showing current/past salary summaries (PDF download) — added to the existing My Profile page rather than a separate route; only shows lines from **finalized** runs (draft runs are admin-only until closed)
- [x] Unit tests for overtime calculation logic (edge cases: exactly 8h, 9-10h, >10h, Shabbat/holiday work) — 10 Vitest tests in `supabase/functions/calculate-payroll/payroll-logic.test.ts`, covering all the listed edge cases plus aggregation and pay calculation; the calculation module has zero Deno/Node-specific imports so the same file is deployed to the Edge Function and unit-tested from Node without duplication
- [x] Commit: "Add salary profiles, overtime engine, and monthly payroll runs"

**Known simplifications (documented in code comments):** "Weekend/holiday" detection is Saturday-only — no Jewish holiday calendar integration (PRD §8 open question #2). Each attendance session is treated as one "day" for the daily overtime threshold, so an employee clocking in/out more than once on the same calendar day gets the threshold applied per-session, not per-day.

**Exit criteria:** Running payroll for a test branch with seeded attendance data produces correct regular/overtime split and a downloadable PDF summary per employee. ✅ Verified end-to-end: seeded an employee with mixed attendance (exactly 8h, 9.5h, 11h, and a Saturday shift) plus a bonus and a deduction; ran payroll via the real Edge Function and got the exact expected `gross_total` (2093.75); generated and downloaded the PDF; finalized the run; confirmed the employee sees it on their My Profile page (and only after finalization). `npm run verify-rls` extended to 22/22 checks, including salary-profile/adjustment/overtime-policy/payroll-run write scoping for all three roles.

---

## Milestone 5 — Documents

Goal: secure document upload/storage tied to employees.

- [x] Create private Supabase Storage bucket for employee documents — `employee-documents`, path convention `documents/<employee_id>/<filename>`
- [x] `documents` table + RLS mirroring access rules (admin: all; branch_manager: own branch; employee: own only) — extended slightly beyond the PRD wording: an employee can also self-upload/delete their own documents (e.g. a signed contract), matching PRD §2 role description for Employee ("Upload personal documents")
- [x] Document upload UI on employee profile (type: contract/id_copy/receipt/other) — shared `EmployeeDocumentsSection` component embedded in both the admin/branch_manager employee-edit dialog and the employee's own My Profile page
- [x] Document list/download UI with signed URL generation
- [x] Commit: "Add employee document upload and storage"

**Bug found & fixed during verification:** an employee could not see their own *primary* branch in the `branches` table — `branches_select_scoped` only checked branches they manage or are an additional (non-primary) member of, never their own `primary_branch_id`. Fixed with a `primary_branch_id()` helper function and an updated policy. `npm run verify-rls` extended to 23/23 checks including a regression test for this.

**Exit criteria:** A contract uploaded for an employee is visible only to Admin, that employee's Branch Manager, and the employee themselves. ✅ Verified end-to-end via Playwright: branch_manager uploads own document → admin sees it while editing that employee, uploads a second document, deletes one → employee in a different branch uploads their own document and only ever sees their own (no nav access to other employees' records at all).

---

## Milestone 6 — Dashboards & Reports

Goal: actionable visibility for managers and admin.

- [x] Branch dashboard: headcount, total hours (regular/overtime split), labor cost, pending approvals count — computed as a **live snapshot** (not dependent on a payroll run having been triggered) by re-running the same pure overtime/pay calculation from Milestone 4 directly against current attendance + salary data, so it reflects reality even mid-month
- [x] Organization dashboard (Admin only): cross-branch cost comparison, month-over-month trend chart — implemented as lightweight proportional bar charts (plain MUI `Box` width percentages) rather than pulling in a charting library, to keep the dependency footprint small for an MVP-scale visualization
- [x] Employee list with filters (branch, role, active status) reused across Admin/Branch Manager views — added the missing "role" filter (admin-only: branch_manager can't read other users' `profiles.role` under RLS, so the filter is hidden for them rather than silently returning nothing)
- [x] Commit: "Add branch and organization dashboards"

**Known simplification:** dashboard metrics are computed live on each request by aggregating attendance/salary data client-side rather than precomputed/cached server-side. Fine at MVP scale (NFR target: ≤50 branches / ≤1,000 employees); would need server-side materialization to stay performant at larger scale, especially the 6-month trend (re-runs the per-branch calculation 6×).

**Exit criteria:** Admin can compare labor cost across all branches for the current month; a Branch Manager sees their own branch's live attendance/cost snapshot. ✅ Verified end-to-end via Playwright: seeded a 9-hour approved shift + a pending manual entry for the branch_manager; their branch dashboard showed the exact expected labor cost (555.00 = 8h×60 + 1h×60×1.25) and a pending-approvals count of 1; the admin's org dashboard showed the identical 555.00 for that branch in the cross-branch comparison; the new role filter correctly isolated branch_managers from employees in the employee list.

---

## Milestone 7 — Polish, i18n Completeness & QA

Goal: production-readiness pass.

- [x] Visual design pass — consistent icon set (`@mui/icons-material`) across nav/actions/empty states; refined theme (teal/amber palette, `borderRadius: 8`, sentence-case buttons instead of MUI's default all-caps, bold table headers); rebuilt `AppLayout` with a responsive hamburger-drawer nav (was a single row of 8 text buttons that visibly crowded/overlapped in English — fixed both the overflow and the underlying cause, the all-caps transform inflating English label width)
- [x] Full i18n audit — grepped for hardcoded `aria-label`/JSX strings; found and fixed 2 hardcoded English `aria-label`s (week navigation) and 3 places displaying the raw `admin`/`branch_manager`/`employee` role string untranslated (added a `roles.*` i18n namespace). The PDF summary content is deliberately left in English regardless of UI language (an internal back-office document, not user-facing UI chrome) — documented as an intentional exception, not an oversight
- [x] Responsive design pass (mobile clock-in flow is priority) — `AppLayout` now switches to a `Drawer` nav below the `md` breakpoint (RTL-aware anchor side); wrapped every data table in `TableContainer` so wide tables (the 10-column payroll table) scroll horizontally instead of breaking the page layout on narrow screens
- [x] Empty states, loading states, and error handling audit across all pages — added icon+text empty states everywhere a list could legitimately be empty (branches, employees, shifts, attendance history/approvals, payroll past runs, documents); `CircularProgress` already covered loading states from earlier milestones; mutation errors already surface via `Alert` (payroll) or are simply prevented via RLS (everything else)
- [x] Accessibility pass (form labels, keyboard navigation, contrast) — audited every `IconButton` for a missing `aria-label` (found and fixed one, on document delete); all form inputs already use MUI `label` props; kept MUI's default focus/keyboard handling (no custom widgets that would need manual key handling); verified the new theme palette against white backgrounds for contrast
- [x] Security review: re-verify RLS policies against the role matrix in PRD §2 — re-read every migration's policies against the PRD §2 table; `npm run verify-rls` (23 checks) already exercises the full matrix end-to-end (not just read-the-SQL) for all three roles across every table with role-scoped access
- [x] Manual end-to-end test pass through all MVP user flows (Admin, Branch Manager, Employee) — ran a consolidated Playwright pass hitting every route for every role post-polish (7 admin routes, 5 branch_manager routes, 4 employee routes) — all load with real content and zero console errors
- [x] Write a minimal README (setup, env vars, deploy instructions) — replaced the leftover Vite template README with real setup/env var/script/deploy docs
- [x] Commit: "Polish UI, complete i18n coverage, and finalize QA pass"

**Exit criteria:** All PRD §4 functional requirements demonstrably work end-to-end; no untranslated strings; RLS verified against the full role matrix. ✅ All of the above verified via Playwright (mobile clock-in flow, desktop nav with icons in both languages, RTL drawer) and `npm run verify-rls` (23/23).

---

## Post-Milestone-7 fix — User invitation flow

**Gap found by the user after Milestone 7:** there was no way to actually add a *new login account* to the system. Creating an employee (Milestone 2) only creates the HR record — `employees.user_id` stayed `null` until someone manually linked it. There was no signup page and no password field anywhere, so admins had no way to onboard a real user.

- [x] `invite-employee` Edge Function (admin-only, same JWT-check pattern as `calculate-payroll`) — calls `auth.admin.inviteUserByEmail` with the service-role key (must never reach the browser) and links the new `auth.users.id` to `employees.user_id`. The existing `handle_new_user` trigger still applies, defaulting the new account to the `employee` role.
- [x] "Invite to system" button in the employee edit dialog (admin-only; disabled until the employee has a saved email address)
- [x] Updated Supabase Auth `site_url` / `additional_redirect_urls` (via `supabase config push`) to point at the real Vercel deployment instead of the scaffolded `localhost:3000` default, so invite links actually redirect somewhere real
- [x] Decided **against** open self-registration and Google OAuth for now (would need a Google Cloud OAuth client the user would have to set up) — admin-invite-by-email is the only onboarding path; both are tracked in the Backlog below if wanted later

**Known side effect:** pushing the full local `supabase/config.toml` also reset a few other remote Auth defaults that had drifted from the checked-in file (notably `enable_confirmations: true → false` for email signups, and MFA enrollment flags). Acceptable for this MVP/dev project — flagged here so it's not a surprise later.

**Verified:** RLS/build/lint/test suite all green after the change. The invite call itself was tested twice — first with `@react-demo.local`/`example.com` test emails, which Supabase Auth correctly rejected (it validates deliverability, not just format) — then with a real mailbox, which succeeded: the Edge Function returned `200`, `employees.user_id` was correctly linked, and the trigger-created profile defaulted to `role = 'employee'` as expected. Test employee/auth user cleaned up afterward.

### Follow-up fix — invite link landed on regular login instead of setting a password

**Bug found by the user after testing the real invite email:** clicking the invite link led to the normal login page instead of a "set your password" screen — and even if a session *had* been silently established, there was no page in the app that let the user actually choose a password, so they'd be stuck unable to ever log in normally again.

- [x] Added `passwordRecovery` state to `AuthContext`, set when Supabase fires the `PASSWORD_RECOVERY` auth event (which both invite and password-reset links trigger)
- [x] New `/set-password` page — calls `supabase.auth.updateUser({ password })` using the temporary session from the invite link, then clears the recovery flag
- [x] `ProtectedRoute` now redirects to `/set-password` whenever `passwordRecovery` is true, instead of rendering the requested page, so the user can't skip this step
- [x] `invite-employee` now accepts and forwards a `redirectTo` (the frontend passes `${origin}/set-password`) instead of relying on the Auth default redirect, and the allow-list in `additional_redirect_urls` was switched to wildcard patterns (`/**`) so any path under the app's origin is permitted — likely the actual root cause, since the previous exact-match entries probably didn't match whatever path Supabase's invite link appended

**Verified:** build/lint/test/verify-rls all green. Sent a second real test invite with the new `redirectTo`; cleanup script removed the test employee/account afterward.

### Follow-up fix #2 — clicking the link gave a Vercel 404, not the app

**Bug found by the user:** clicking the (correctly-redirecting) invite link returned a Vercel `404: NOT_FOUND` page instead of the app. Root cause: this is a single-page app with client-side routing (`BrowserRouter`), but Vercel had no rewrite rule telling it to serve `index.html` for paths that aren't real static files. `/set-password` doesn't exist on disk — only `index.html` + JS bundles do — so a *direct/hard navigation* to any deep route (not just `/set-password`; confirmed `/employees` 404'd too) failed. This never surfaced in any earlier Playwright pass because every test navigated via in-app client-side links from `/`, never via a hard browser navigation straight to a deep URL.

- [x] Added `vercel.json` with a catch-all rewrite (`"/(.*)" → "/index.html"`) so any path with no matching static file falls back to the SPA shell and lets React Router take over. Vercel checks for real static files (JS/CSS/images) *before* applying rewrites, so this doesn't break asset loading.

**Verified:** confirmed both `/employees` and `/set-password` returned `404` before the fix via direct `curl` requests (proving it wasn't invite-link-specific), then redeployed and re-confirmed `200` after.

---

## Milestone 8 — MVP Launch

- [ ] Final production Supabase project setup (separate from dev) with migrations applied
- [ ] Production environment variables configured in Vercel
- [ ] Create initial production Admin user and at least one real branch
- [ ] Smoke test in production
- [ ] Tag release `v1.0.0`
- [ ] Commit/tag: "Release v1.0.0 — MVP launch"

---

## Backlog (Post-MVP — see PRD §7.2)

- [ ] Multi-tenant SaaS support
- [ ] CSV/Excel payroll export
- [ ] Integration with official Israeli payroll/tax reporting systems
- [ ] PWA / push notifications
- [ ] Auto-suggested shift scheduling
- [ ] Split-shift cost allocation reporting for multi-branch employees
- [ ] Google sign-in (OAuth) as an alternative to email/password — needs a Google Cloud OAuth client (Client ID/Secret) the user sets up, then enabling the provider in Supabase Auth
- [ ] Open self-registration (vs. admin-invite-only) — would need a signup page; the `handle_new_user` trigger already defaults new accounts to the `employee` role, so the main missing piece is the UI and a decision on whether self-registered accounts should require admin approval before being linked to an employee record
