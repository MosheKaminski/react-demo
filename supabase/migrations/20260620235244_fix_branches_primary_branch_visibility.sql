-- Fix: an employee could not see their own *primary* branch in the
-- branches table. branches_select_scoped only checked managed_branch_ids()
-- (branches they manage) and member_branch_ids() (additional, non-primary
-- assignments via employee_branch_assignments) - it never checked the
-- employee's own primary_branch_id. Discovered while verifying Milestone 5
-- (My Profile failed to show the employee's own branch name).

create or replace function public.primary_branch_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select primary_branch_id from public.employees where id = public.current_employee_id();
$$;

drop policy "branches_select_scoped" on public.branches;

create policy "branches_select_scoped" on public.branches
  for select using (
    public.is_admin()
    or id in (select public.managed_branch_ids())
    or id in (select public.member_branch_ids())
    or id = public.primary_branch_id()
  );
