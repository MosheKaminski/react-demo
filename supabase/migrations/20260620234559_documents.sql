-- Milestone 5: employee documents (contracts, ID copies, receipts) with a
-- private storage bucket, mirroring the same branch-scoped access rules
-- used elsewhere (PRD FR-23/FR-24).
-- Object path convention: documents/<employee_id>/<filename>

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  type text not null check (type in ('contract', 'id_copy', 'receipt', 'other')),
  file_path text not null,
  uploaded_by uuid references public.profiles (id),
  uploaded_at timestamptz not null default now()
);

create index documents_employee_id_idx on public.documents (employee_id);

alter table public.documents enable row level security;

-- documents: admin full access; branch_manager scoped to their branch's
-- employees; an employee can manage their own documents (FR-23 allows
-- self-upload, e.g. a signed contract).
create policy "documents_select_scoped" on public.documents
  for select using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

create policy "documents_insert_scoped" on public.documents
  for insert with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

create policy "documents_delete_scoped" on public.documents
  for delete using (
    public.is_admin()
    or employee_id = public.current_employee_id()
    or employee_id in (
      select id from public.employees
      where primary_branch_id in (select public.managed_branch_ids())
    )
  );

insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

create policy "employee_documents_select_scoped" on storage.objects
  for select using (
    bucket_id = 'employee-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[2]::uuid = public.current_employee_id()
      or (storage.foldername(name))[2]::uuid in (
        select id from public.employees
        where primary_branch_id in (select public.managed_branch_ids())
      )
    )
  );

create policy "employee_documents_insert_scoped" on storage.objects
  for insert with check (
    bucket_id = 'employee-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[2]::uuid = public.current_employee_id()
      or (storage.foldername(name))[2]::uuid in (
        select id from public.employees
        where primary_branch_id in (select public.managed_branch_ids())
      )
    )
  );

create policy "employee_documents_delete_scoped" on storage.objects
  for delete using (
    bucket_id = 'employee-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[2]::uuid = public.current_employee_id()
      or (storage.foldername(name))[2]::uuid in (
        select id from public.employees
        where primary_branch_id in (select public.managed_branch_ids())
      )
    )
  );
