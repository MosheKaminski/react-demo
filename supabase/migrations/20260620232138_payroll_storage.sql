-- Private storage bucket for per-employee payroll PDF summaries (PRD FR-18).
-- Object path convention: payroll/<employee_id>/<payroll_run_id>.pdf

insert into storage.buckets (id, name, public)
values ('payroll-pdfs', 'payroll-pdfs', false)
on conflict (id) do nothing;

create policy "payroll_pdfs_select_scoped" on storage.objects
  for select using (
    bucket_id = 'payroll-pdfs'
    and (
      public.is_admin()
      or (storage.foldername(name))[2]::uuid = public.current_employee_id()
      or (storage.foldername(name))[2]::uuid in (
        select id from public.employees
        where primary_branch_id in (select public.managed_branch_ids())
      )
    )
  );

create policy "payroll_pdfs_insert_admin" on storage.objects
  for insert with check (bucket_id = 'payroll-pdfs' and public.is_admin());

create policy "payroll_pdfs_update_admin" on storage.objects
  for update using (bucket_id = 'payroll-pdfs' and public.is_admin());

create policy "payroll_pdfs_delete_admin" on storage.objects
  for delete using (bucket_id = 'payroll-pdfs' and public.is_admin());
