-- Milestone 3: attendance tracking (clock-in/out + manual entries with
-- approval workflow) and shift scheduling, both branch-scoped via RLS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  source text not null check (source in ('app', 'manual_entry')),
  geo_lat numeric(9, 6),
  geo_lng numeric(9, 6),
  -- App-originated clock-ins are the employee's own real-time action and are
  -- auto-approved; manager-entered/edited records need explicit approval
  -- (PRD FR-10).
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  role_in_shift text,
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index attendance_records_employee_id_idx on public.attendance_records (employee_id);
create index attendance_records_branch_id_idx on public.attendance_records (branch_id);
create index shifts_branch_id_idx on public.shifts (branch_id);
create index shifts_employee_id_idx on public.shifts (employee_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.attendance_records enable row level security;
alter table public.shifts enable row level security;

-- attendance_records
create policy "attendance_select_scoped" on public.attendance_records
  for select using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or branch_id in (select public.managed_branch_ids())
  );

-- An employee may only ever clock themselves in (source = 'app'); managers
-- and admins may also create manual entries for employees in their branch.
create policy "attendance_insert_scoped" on public.attendance_records
  for insert with check (
    public.is_admin()
    or (source = 'app' and employee_id = public.current_employee_id())
    or (source = 'manual_entry' and branch_id in (select public.managed_branch_ids()))
  );

-- Employees may update their own open app-clocked record (to clock out).
-- Managers/admins may edit/approve/reject records in their branch.
create policy "attendance_update_scoped" on public.attendance_records
  for update using (
    public.is_admin()
    or (source = 'app' and employee_id = public.current_employee_id())
    or branch_id in (select public.managed_branch_ids())
  ) with check (
    public.is_admin()
    or (source = 'app' and employee_id = public.current_employee_id())
    or branch_id in (select public.managed_branch_ids())
  );

-- shifts: everyone in scope can read; only managers/admins can write.
create policy "shifts_select_scoped" on public.shifts
  for select using (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
    or employee_id = public.current_employee_id()
  );

create policy "shifts_write_admin_or_branch_manager" on public.shifts
  for all using (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
  ) with check (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- Clock-out RPC: lets the client ask for "now" without trusting the client
-- clock, while still going through normal RLS as the calling user
-- (SECURITY INVOKER, the default for SQL functions).
-- ---------------------------------------------------------------------------

create function public.clock_out_attendance(p_attendance_id uuid)
returns public.attendance_records
language sql
as $$
  update public.attendance_records
  set clock_out = now()
  where id = p_attendance_id
  returning *;
$$;
