-- Milestone 4: salary adjustments, configurable overtime policy, and
-- monthly payroll runs/lines. salary_profiles + its RLS already exist
-- from Milestone 1 and already match this milestone's requirements
-- (admin write, branch_manager read-only, employee reads own).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.salary_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  type text not null check (type in ('bonus', 'deduction', 'addition')),
  amount numeric(10, 2) not null,
  description text,
  -- Always the 1st of the target month, e.g. 2026-06-01.
  effective_month date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Single-row configurable overtime policy (admin-editable). Daily/weekly
-- thresholds and rates are parameters, not hardcoded, since labor law and
-- company policy may change (PRD FR-16).
create table public.overtime_policies (
  id uuid primary key default gen_random_uuid(),
  daily_regular_hours numeric(4, 2) not null default 8,
  daily_125_hours numeric(4, 2) not null default 2,
  rate_125 numeric(4, 3) not null default 1.25,
  rate_150 numeric(4, 3) not null default 1.50,
  weekend_holiday_rate numeric(4, 3) not null default 1.50,
  updated_at timestamptz not null default now()
);

insert into public.overtime_policies (id) values (gen_random_uuid());

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  branch_id uuid references public.branches (id),
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  generated_by uuid references public.profiles (id),
  generated_at timestamptz not null default now(),
  finalized_at timestamptz,
  audit_note text
);

create table public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  regular_hours numeric(7, 2) not null default 0,
  overtime_125_hours numeric(7, 2) not null default 0,
  overtime_150_hours numeric(7, 2) not null default 0,
  weekend_holiday_hours numeric(7, 2) not null default 0,
  gross_base numeric(10, 2) not null default 0,
  gross_overtime numeric(10, 2) not null default 0,
  adjustments_total numeric(10, 2) not null default 0,
  gross_total numeric(10, 2) not null default 0,
  pdf_path text,
  created_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

create index salary_adjustments_employee_id_idx on public.salary_adjustments (employee_id);
create index payroll_lines_payroll_run_id_idx on public.payroll_lines (payroll_run_id);
create index payroll_lines_employee_id_idx on public.payroll_lines (employee_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.salary_adjustments enable row level security;
alter table public.overtime_policies enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_lines enable row level security;

-- salary_adjustments: admin full access; branch_manager can add/view entries
-- for employees in their branch; employee can view their own.
create policy "salary_adjustments_select_scoped" on public.salary_adjustments
  for select using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

create policy "salary_adjustments_insert_scoped" on public.salary_adjustments
  for insert with check (
    public.is_admin()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

create policy "salary_adjustments_write_admin" on public.salary_adjustments
  for update using (public.is_admin()) with check (public.is_admin());

create policy "salary_adjustments_delete_admin" on public.salary_adjustments
  for delete using (public.is_admin());

-- overtime_policies: admin and branch_manager can read; only admin can edit.
create policy "overtime_policies_select_admin_or_manager" on public.overtime_policies
  for select using (public.is_admin() or public.current_user_role() = 'branch_manager');

create policy "overtime_policies_write_admin" on public.overtime_policies
  for update using (public.is_admin()) with check (public.is_admin());

-- payroll_runs / payroll_lines: admin full access; branch_manager can read
-- runs/lines scoped to their branch (or org-wide runs, since those include
-- their branch's employees too); employee can read only their own lines.
-- All writes happen through the calculate-payroll Edge Function using the
-- service role key, so only SELECT policies are needed for branch_manager
-- and employee; admin keeps full access for completeness/manual fixes.
create policy "payroll_runs_select_scoped" on public.payroll_runs
  for select using (
    public.is_admin()
    or branch_id is null
    or branch_id in (select public.managed_branch_ids())
  );

create policy "payroll_runs_write_admin" on public.payroll_runs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "payroll_lines_select_scoped" on public.payroll_lines
  for select using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

create policy "payroll_lines_write_admin" on public.payroll_lines
  for all using (public.is_admin()) with check (public.is_admin());
