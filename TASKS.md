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
- [x] Employee create/edit form (personal info, start/end date, role, primary branch) — role is shown/editable only once the employee has a linked login account (`profiles.role`); creating a login account is a future "invite" feature, out of scope for this milestone
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

- [ ] `attendance_records` table + RLS (employee: own records; branch_manager: own branch; admin: all)
- [ ] Clock-in / clock-out UI (button + server-side timestamp via Supabase RPC/Edge Function, optional geolocation capture with consent prompt)
- [ ] Manual attendance entry form (Branch Manager) with mandatory note, status = `pending`
- [ ] Attendance approval queue page (Branch Manager/Admin) — approve/reject pending entries
- [ ] `shifts` table + RLS (branch-scoped)
- [ ] Shift scheduling UI — weekly/monthly calendar view per branch, create/assign/publish shifts
- [ ] Employee "My Shifts" read-only view
- [ ] Conflict detection: flag overlapping shifts for the same employee across branches
- [ ] Commit: "Add attendance tracking, approval workflow, and shift scheduling"

**Exit criteria:** An employee can clock in/out; a manager can approve it; a manager can build and publish a weekly schedule; an employee sees their upcoming shifts.

---

## Milestone 4 — Salary Profiles & Payroll Engine

Goal: automatic, legally-compliant overtime calculation and a working monthly payroll run.

- [ ] `salary_profiles` table (versioned by `effective_from`/`effective_to`) + RLS (admin write, branch_manager read-only, employee: own only)
- [ ] Salary profile management UI (Admin) — set pay type, base rate, overtime eligibility
- [ ] `salary_adjustments` table (bonus/deduction/addition) + UI for Admin/Branch Manager to add entries
- [ ] Configurable overtime policy table (daily/weekly thresholds, 125%/150% rates, weekend/holiday rate) — Admin-editable settings page
- [ ] Supabase Edge Function: overtime calculation logic (regular vs. 125% vs. 150% vs. weekend/holiday hours) operating on approved attendance records
- [ ] Supabase Edge Function: monthly payroll aggregation (`payroll_runs` + `payroll_lines`) combining hours + adjustments
- [ ] Payroll run trigger UI (Admin) — select month/branch, run calculation, review draft results
- [ ] Payroll finalize/lock flow (status `draft` → `finalized`, blocks further edits unless reopened with audit note)
- [ ] PDF generation for per-employee salary summary (client-side or Edge Function), stored in Supabase Storage
- [ ] Employee view: "My Pay" page showing current/past salary summaries (PDF download)
- [ ] Unit tests for overtime calculation logic (edge cases: exactly 8h, 9-10h, >10h, Shabbat/holiday work)
- [ ] Commit: "Add salary profiles, overtime engine, and monthly payroll runs"

**Exit criteria:** Running payroll for a test branch with seeded attendance data produces correct regular/overtime split and a downloadable PDF summary per employee.

---

## Milestone 5 — Documents

Goal: secure document upload/storage tied to employees.

- [ ] Create private Supabase Storage bucket for employee documents
- [ ] `documents` table + RLS mirroring access rules (admin: all; branch_manager: own branch; employee: own only)
- [ ] Document upload UI on employee profile (type: contract/id_copy/receipt/other)
- [ ] Document list/download UI with signed URL generation
- [ ] Commit: "Add employee document upload and storage"

**Exit criteria:** A contract uploaded for an employee is visible only to Admin, that employee's Branch Manager, and the employee themselves.

---

## Milestone 6 — Dashboards & Reports

Goal: actionable visibility for managers and admin.

- [ ] Branch dashboard: headcount, total hours (regular/overtime split), labor cost, pending approvals count
- [ ] Organization dashboard (Admin only): cross-branch cost comparison, month-over-month trend chart
- [ ] Employee list with filters (branch, role, active status) reused across Admin/Branch Manager views
- [ ] Commit: "Add branch and organization dashboards"

**Exit criteria:** Admin can compare labor cost across all branches for the current month; a Branch Manager sees their own branch's live attendance/cost snapshot.

---

## Milestone 7 — Polish, i18n Completeness & QA

Goal: production-readiness pass.

- [ ] Full i18n audit — no hardcoded strings, verify Hebrew RTL layout on every screen
- [ ] Responsive design pass (mobile clock-in flow is priority)
- [ ] Empty states, loading states, and error handling audit across all pages
- [ ] Accessibility pass (form labels, keyboard navigation, contrast)
- [ ] Security review: re-verify RLS policies against the role matrix in PRD §2
- [ ] Manual end-to-end test pass through all MVP user flows (Admin, Branch Manager, Employee)
- [ ] Write a minimal README (setup, env vars, deploy instructions)
- [ ] Commit: "Polish UI, complete i18n coverage, and finalize QA pass"

**Exit criteria:** All PRD §4 functional requirements demonstrably work end-to-end; no untranslated strings; RLS verified against the full role matrix.

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
