# Product Requirements Document (PRD)
## Employee / Branch Management System

| | |
|---|---|
| **Document Status** | Draft v1.0 |
| **Date** | 2026-06-17 |
| **Author** | Moshe Kaminski |
| **Target Scope** | MVP for a small/medium business |

---

## 1. Overview

A web-based management system that lets a business owner manage **branches**, **employees**, **attendance/shifts**, and **salary calculation** (including overtime per Israeli labor law), with reporting and document storage. The MVP targets internal use by a single organization (not a multi-tenant SaaS product), with room to evolve toward shift scheduling and richer reporting.

### 1.1 Goals
- Centralize employee and branch data in one system.
- Track attendance (clock-in/clock-out) and planned shifts per branch.
- Automatically calculate salary, including legally-compliant overtime rates.
- Give branch managers visibility into their own branch's people, hours, and costs.
- Store employee-related documents (contracts, ID copies, receipts) securely.
- Provide a bilingual (Hebrew RTL / English LTR) responsive web UI.

### 1.2 Non-Goals (out of scope for MVP)
- Multi-tenant SaaS architecture (separate paying customers/orgs).
- Native mobile apps (a responsive web app is sufficient).
- Full payroll/tax filing integration with government systems (Form 101, Bituach Leumi reporting, etc.) — the system produces salary **reports**, not official payslips submitted to authorities.
- Recruitment / applicant tracking.

---

## 2. Users & Roles

| Role | Scope | Key Permissions |
|---|---|---|
| **System Admin** | Entire organization, all branches | Create/edit/delete branches, employees, managers; configure salary rules and overtime policy; view all reports; manage system settings; full document access |
| **Branch Manager** | A single assigned branch | Manage employees within their branch (create/edit, not delete without admin approval); approve/edit attendance & shift entries; view branch-level dashboards/reports; upload branch employee documents |
| **Employee** | Self only | View own profile, pay details, and payslip-style summary; clock in/out; view assigned shifts; upload personal documents (e.g., signed contract) |

### 2.1 Permission Notes
- A branch manager cannot see or modify data belonging to other branches.
- Salary configuration (rates, overtime rules) is editable only by System Admin; branch managers can view but not change pay rates unless explicitly granted.
- All role/permission checks are enforced both in the UI and at the database level via Supabase Row Level Security (RLS) — UI-level restrictions alone are not sufficient.

---

## 3. Core Entities (Data Model Summary)

```
Organization (single row for MVP, future-proofs multi-tenancy)
 └─ Branch
     └─ Employee  ──< EmployeeBranchAssignment (supports employee working across branches, primary branch flag)
         ├─ SalaryProfile (pay type, base rate, overtime eligibility)
         ├─ AttendanceRecord (clock-in/out, source: app/manual, geolocation, status)
         ├─ Shift (scheduled shift, assigned employee, branch, start/end)
         ├─ SalaryAdjustment (bonus, deduction, one-time addition, note)
         ├─ Document (contract, ID, certificate — stored in Supabase Storage)
         └─ PayrollRun / PayrollLine (monthly calculated summary, generated PDF)
```

### 3.1 Key Entities — Field Detail

**Branch**
- `id`, `name`, `address`, `phone`, `manager_id` (FK → Employee/User), `is_active`, `created_at`

**Employee**
- `id`, `user_id` (FK → Supabase Auth user), `full_name`, `id_number` (תז), `phone`, `email`, `start_date`, `end_date` (nullable), `role` (admin/branch_manager/employee), `primary_branch_id`, `is_active`

**SalaryProfile**
- `employee_id`, `pay_type` (`hourly` | `monthly`), `base_rate` (₪/hour or ₪/month), `weekly_hours_baseline` (for overtime threshold calc), `overtime_eligible` (bool), `effective_from`, `effective_to`

**AttendanceRecord**
- `id`, `employee_id`, `branch_id`, `clock_in`, `clock_out`, `source` (`app` | `manual_entry`), `geo_lat`/`geo_lng` (nullable, app source only), `status` (`pending` | `approved` | `rejected`), `approved_by`, `notes`

**Shift**
- `id`, `branch_id`, `employee_id` (nullable until assigned), `start_time`, `end_time`, `role_in_shift` (optional), `status` (`draft` | `published` | `completed` | `cancelled`)

**SalaryAdjustment**
- `id`, `employee_id`, `type` (`bonus` | `deduction` | `addition`), `amount`, `description`, `effective_month`, `created_by`

**Document**
- `id`, `employee_id`, `branch_id` (nullable), `type` (`contract` | `id_copy` | `receipt` | `other`), `file_path` (Supabase Storage), `uploaded_by`, `uploaded_at`

**PayrollRun / PayrollLine**
- `PayrollRun`: `id`, `period_month`, `period_year`, `branch_id` (nullable = all branches), `generated_at`, `generated_by`, `status` (`draft` | `finalized`)
- `PayrollLine`: `payroll_run_id`, `employee_id`, `regular_hours`, `overtime_125_hours`, `overtime_150_hours`, `weekend_holiday_hours`, `gross_base`, `gross_overtime`, `adjustments_total`, `gross_total`, `pdf_url`

---

## 4. Functional Requirements

### 4.1 Branch Management
- FR-1: Admin can create, edit, deactivate branches.
- FR-2: Each branch has an assigned Branch Manager (one primary; future: multiple).
- FR-3: Admin can view a cross-branch dashboard (headcount, total hours, total cost per branch).

### 4.2 Employee Management
- FR-4: Admin/Branch Manager can create employee records with personal details, start date, assigned branch(es), and role.
- FR-5: An employee can be assigned to more than one branch, with one marked as primary.
- FR-6: Employee records support soft-deactivation (end date) rather than hard delete, to preserve historical payroll data.
- FR-7: Each employee has a self-service profile page (view personal info, pay summary, documents, shifts).

### 4.3 Attendance & Shifts
- FR-8: Employees can clock in/out via a web app button; the system timestamps the action server-side (not client clock) and optionally captures geolocation if granted by the browser.
- FR-9: Branch Managers can manually create/edit attendance entries for employees who forgot to clock in/out (`source = manual_entry`), with mandatory note.
- FR-10: All manually-entered or edited attendance records require Branch Manager or Admin approval before they count toward payroll (`status` workflow: pending → approved/rejected).
- FR-11: Branch Managers can build a weekly/monthly **shift schedule** per branch: create shifts, assign employees, publish the schedule.
- FR-12: Employees can view their upcoming assigned shifts (read-only).
- FR-13: The system flags scheduling conflicts (same employee double-booked overlapping shifts across branches).

### 4.4 Salary & Payroll Calculation
- FR-14: Each employee has a `SalaryProfile` defining pay type (hourly or monthly) and base rate. Profiles are versioned by `effective_from`/`effective_to` so historical payroll recalculation stays accurate after a raise.
- FR-15: The system supports **bonuses, deductions, and one-time additions** per employee per month (`SalaryAdjustment`), entered by Admin or Branch Manager (subject to permission).
- FR-16: **Overtime is calculated automatically per Israeli labor law** for hourly employees:
  - First 8 hours/day (or up to weekly baseline) = regular rate (100%).
  - Hours 9–10 in a single day = 125% of base rate.
  - Hours beyond 10 in a single day = 150% of base rate.
  - Work on the weekly rest day (Shabbat) or statutory holidays = minimum 150%, configurable by Admin.
  - Daily/weekly overtime thresholds and percentages are stored as **configurable parameters** (not hardcoded), since labor law and company policy may change.
  - Monthly-salary employees are excluded from automatic overtime calculation unless explicitly flagged `overtime_eligible`.
- FR-17: Admin can run a **monthly Payroll Run** per branch or for the whole organization, which aggregates approved attendance + shifts + adjustments into a `PayrollLine` per employee.
- FR-18: The system generates a **PDF salary summary** per employee per payroll run (not an official, legally-binding payslip — clearly labeled as an internal summary) and stores it for reference, viewable in-app by the employee and Admin/Branch Manager.
- FR-19: Once a Payroll Run is finalized, its lines are locked from further edits unless explicitly reopened by Admin (with an audit note).

### 4.5 Reporting & Dashboards
- FR-20: Branch dashboard: headcount, total hours worked (regular/overtime split), total branch labor cost, attendance approval queue.
- FR-21: Organization-wide dashboard (Admin only): cost comparison across branches, month-over-month labor cost trend.
- FR-22: Filterable employee list with status (active/inactive), branch, and role.

### 4.6 Documents
- FR-23: Upload and store employee documents (signed contract, ID copy, certificates) in Supabase Storage, linked to the employee record.
- FR-24: Access to documents is restricted by role: Admin sees all; Branch Manager sees only their branch's employees' documents; Employee sees only their own.

### 4.7 Authentication & Notifications
- FR-25: Authentication via Supabase Auth (email/password, with optional magic link).
- FR-26: Branch Managers and Admin receive an in-app notification (and optionally email) when an attendance record requires approval.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Localization** | Full Hebrew (RTL) and English (LTR) support via an i18n library; layout direction switches automatically with language; date/number formats localized. |
| **Security** | Supabase Row Level Security enforced on every table; role-based access control mirrored in both DB policies and frontend route guards; documents stored in private (non-public) storage buckets with signed URLs. |
| **Auditability** | Key actions (attendance approval/edit, payroll finalization, salary profile changes) are logged with `created_by`/`updated_by` and timestamps. |
| **Performance** | Dashboard queries should return in <2s for an organization with up to ~50 branches / ~1,000 employees (MVP scale target). |
| **Availability** | Standard cloud SLA via Supabase + Vercel managed hosting; no custom HA requirement for MVP. |
| **Responsiveness** | UI must be fully usable on mobile browsers (clock-in is a primary mobile use case) and desktop; no native app required. |
| **Data Retention** | Historical payroll and attendance data is retained indefinitely (no automatic purge) for audit/legal purposes. |

---

## 6. Technical Architecture

### 6.1 Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18+ with Vite, TypeScript |
| UI/Styling | Component library (e.g., MUI or Chakra UI) with RTL support; i18next for localization |
| State/Data fetching | React Query (TanStack Query) for server state; Supabase JS client |
| Backend / API | Supabase (hosted PostgreSQL + auto-generated REST/RPC via PostgREST + Realtime) |
| Auth | Supabase Auth (email/password, JWT-based sessions) |
| Authorization | PostgreSQL Row Level Security (RLS) policies per table, keyed on `auth.uid()` and a `profiles`/`employees` role mapping |
| File Storage | Supabase Storage (private buckets, signed URLs) for documents |
| PDF Generation | Generated client-side (e.g., `@react-pdf/renderer`) or via a Supabase Edge Function, stored back into Supabase Storage |
| Hosting (frontend) | Vercel (CI/CD from GitHub repo, preview deployments per PR) |
| Hosting (backend) | Supabase managed cloud project |
| Source Control / CI | GitHub repository (`react-demo`), GitHub Actions or Vercel's built-in pipeline for build/lint/test on PR |

### 6.2 High-Level Architecture

```
┌──────────────────────┐        HTTPS / JWT        ┌─────────────────────────┐
│  React + Vite SPA     │ ─────────────────────────▶│  Supabase Project        │
│  (Vercel hosting)     │                            │  - PostgreSQL + RLS      │
│                        │ ◀───────────────────────── │  - Auth                  │
│  - Admin views         │     REST/RPC + Realtime    │  - Storage (documents)   │
│  - Branch Mgr views     │                            │  - Edge Functions        │
│  - Employee self-service│                            │    (payroll calc, PDF)  │
└──────────────────────┘                            └─────────────────────────┘
```

- **Payroll calculation logic** (overtime rules, aggregation) lives in a Supabase **Edge Function** (TypeScript/Deno) rather than the frontend, so the rules are enforced server-side and consistent regardless of client.
- **Row Level Security** is the primary authorization mechanism: every table has policies restricting `SELECT`/`INSERT`/`UPDATE` based on the requesting user's role and branch assignment, so even direct API access cannot bypass permissions.

### 6.3 Why Supabase
- Native PostgreSQL fits relational data (employees, branches, payroll) better than a NoSQL store.
- Built-in RLS directly satisfies the branch-scoped permission model without a custom authorization layer.
- Built-in Auth + Storage removes the need for separate services in the MVP.
- Open-source/portable if self-hosting is needed later.

---

## 7. MVP Scope vs. Future Phases

### 7.1 MVP (Phase 1)
- Branch CRUD, Employee CRUD, role-based access (Admin/Branch Manager/Employee).
- Clock-in/out (app) + manual attendance entry with approval workflow.
- Shift scheduling (create/assign/publish) per branch.
- Salary profiles (hourly/monthly), bonuses/deductions, automatic overtime calculation per Israeli labor law.
- Monthly payroll run + PDF salary summary.
- Branch and org-level dashboards.
- Document upload/storage (contracts, IDs, receipts).
- Hebrew/English i18n with RTL support.

### 7.2 Future Phases (not in MVP)
- Multi-tenant SaaS support (separate paying organizations with data isolation).
- CSV/Excel export of payroll data for external accounting systems.
- Integration with official Israeli payroll/reporting systems (Form 101, Bituach Leumi, tax authority reporting).
- Native mobile app or PWA with push notifications.
- Advanced scheduling (auto-suggested shifts based on availability/labor cost optimization).
- Multi-branch employees with split-shift cost allocation reporting.

---

## 8. Open Questions / Risks

| # | Topic | Question | Risk if unresolved |
|---|---|---|---|
| 1 | Legal compliance | The generated PDF is an internal "salary summary," not an official payslip. Confirm this distinction is acceptable for the business's actual payroll process. | Could be mistaken for a compliant payslip, creating legal exposure. |
| 2 | Overtime law accuracy | Israeli overtime law has nuances (e.g., partial week, employees under special agreements, "global hours" arrangements). Confirm whether any employees are exempt from standard overtime rules. | Incorrect pay calculation. |
| 3 | Geolocation privacy | Clock-in geolocation capture requires employee consent and a clear privacy notice. | Privacy/legal compliance issue. |
| 4 | Data ownership transition | Since this starts as a single-org MVP on shared Supabase tables (not fully multi-tenant), migrating to multi-tenant SaaS later will require a schema migration. | Future rework cost — acceptable tradeoff for MVP speed, but should be documented. |

---

## 9. Success Metrics (MVP)

- 100% of active employees have a complete profile + salary profile in the system within first month of rollout.
- Attendance approval turnaround (pending → approved/rejected) under 24 hours on average.
- Payroll run for a full month completes (calculation + PDF generation) in under 1 minute for ~100 employees.
- Zero unauthorized cross-branch data access incidents (validated via RLS policy tests).
