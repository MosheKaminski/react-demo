-- Milestone 1: core schema (organizations, profiles, branches, employees,
-- employee_branch_assignments, salary_profiles) with role helper functions
-- and baseline Row Level Security policies.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per auth.users entry. Created automatically by the
-- handle_new_user trigger below, defaulting to the 'employee' role.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'employee' check (role in ('admin', 'branch_manager', 'employee')),
  created_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  manager_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  id_number text,
  phone text,
  email text,
  start_date date not null default current_date,
  end_date date,
  primary_branch_id uuid references public.branches (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.branches
  add constraint branches_manager_id_fkey
  foreign key (manager_id) references public.employees (id) on delete set null;

create table public.employee_branch_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employee_id, branch_id)
);

create table public.salary_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  pay_type text not null check (pay_type in ('hourly', 'monthly')),
  base_rate numeric(10, 2) not null,
  weekly_hours_baseline numeric(5, 2),
  overtime_eligible boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now()
);

create index employees_primary_branch_id_idx on public.employees (primary_branch_id);
create index employee_branch_assignments_branch_id_idx on public.employee_branch_assignments (branch_id);
create index salary_profiles_employee_id_idx on public.salary_profiles (employee_id);

-- ---------------------------------------------------------------------------
-- Role helper functions (security definer so they can read profiles/employees
-- without being blocked by the very RLS policies that call them)
-- ---------------------------------------------------------------------------

create function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create function public.current_employee_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.employees where user_id = auth.uid();
$$;

create function public.managed_branch_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.branches where manager_id = public.current_employee_id();
$$;

create function public.member_branch_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select branch_id from public.employee_branch_assignments where employee_id = public.current_employee_id();
$$;

-- ---------------------------------------------------------------------------
-- New-user trigger: every Supabase Auth signup gets a profile row,
-- defaulting to the least-privileged 'employee' role.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.employees enable row level security;
alter table public.employee_branch_assignments enable row level security;
alter table public.salary_profiles enable row level security;

-- organizations: admin only (single-org MVP)
create policy "organizations_select_admin" on public.organizations
  for select using (public.is_admin());
create policy "organizations_write_admin" on public.organizations
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: a user can read their own profile; admins can read/manage all
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- branches: admin full access; branch managers and assigned employees can
-- read their own branch(es); only admin can create/edit/deactivate branches
create policy "branches_select_scoped" on public.branches
  for select using (
    public.is_admin()
    or id in (select public.managed_branch_ids())
    or id in (select public.member_branch_ids())
  );
create policy "branches_write_admin" on public.branches
  for all using (public.is_admin()) with check (public.is_admin());

-- employees: admin full access; branch managers can manage employees in
-- their branch; an employee can read their own record
create policy "employees_select_scoped" on public.employees
  for select using (
    public.is_admin()
    or primary_branch_id in (select public.managed_branch_ids())
    or id in (
      select employee_id from public.employee_branch_assignments
      where branch_id in (select public.managed_branch_ids())
    )
    or user_id = auth.uid()
  );
create policy "employees_insert_admin_or_branch_manager" on public.employees
  for insert with check (
    public.is_admin()
    or primary_branch_id in (select public.managed_branch_ids())
  );
create policy "employees_update_admin_or_branch_manager" on public.employees
  for update using (
    public.is_admin()
    or primary_branch_id in (select public.managed_branch_ids())
  ) with check (
    public.is_admin()
    or primary_branch_id in (select public.managed_branch_ids())
  );

-- employee_branch_assignments: scoped the same way as employees
create policy "eba_select_scoped" on public.employee_branch_assignments
  for select using (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
    or employee_id = public.current_employee_id()
  );
create policy "eba_write_admin_or_branch_manager" on public.employee_branch_assignments
  for all using (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
  ) with check (
    public.is_admin()
    or branch_id in (select public.managed_branch_ids())
  );

-- salary_profiles: admin can read/write everything; branch managers can read
-- (not write) salary profiles of employees in their branch; an employee can
-- read their own. Full versioning/overtime logic lands in Milestone 4.
create policy "salary_profiles_select_scoped" on public.salary_profiles
  for select using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );
create policy "salary_profiles_write_admin" on public.salary_profiles
  for all using (public.is_admin()) with check (public.is_admin());
