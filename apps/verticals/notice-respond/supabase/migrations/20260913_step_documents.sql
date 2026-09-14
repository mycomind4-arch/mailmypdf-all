-- Step-workflow document storage: real bytes for files uploaded in a
-- step-matter's Documents step (see @mailmypdf/step-workflow), so the
-- Mail/Review step's packet preview (PagePreviewGrid, tax-notice-packet.ts)
-- has real content to render and merge instead of only a filename.
--
-- Mirrors notice_respond_step_matters' conventions exactly (see
-- 20260912_step_matters.sql): owner_id is TEXT compared against
-- auth.uid()::text, RLS grants clients read-only access to their own rows,
-- and every mutation goes through the service role via server functions
-- (uploadStepDocument / downloadStepDocument / deleteStepDocument) rather
-- than direct client table or storage access — this app's storage buckets
-- (see notice-evidence, notice-source-documents in
-- 20260910190000_operational_readiness.sql) are all private and
-- service-role-mediated the same way.

create table if not exists public.notice_respond_step_documents (
  id uuid primary key,
  matter_id uuid not null references public.notice_respond_step_matters(id) on delete cascade,
  owner_id text not null,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size >= 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (matter_id, id)
);

create index if not exists notice_respond_step_documents_matter_idx
  on public.notice_respond_step_documents(matter_id);
create index if not exists notice_respond_step_documents_owner_idx
  on public.notice_respond_step_documents(owner_id, created_at desc);

alter table public.notice_respond_step_documents enable row level security;

drop policy if exists notice_respond_step_documents_select_own
  on public.notice_respond_step_documents;
create policy notice_respond_step_documents_select_own
  on public.notice_respond_step_documents
  for select
  to authenticated
  using (auth.uid()::text = owner_id);

-- No insert/update/delete policies: every mutation is service-role-only,
-- via the server functions in src/lib/fns/step-document.ts, which verify
-- the caller owns the matter before touching storage or this table.

insert into storage.buckets (id, name, public)
values ('notice-respond-step-documents', 'notice-respond-step-documents', false)
on conflict (id) do update set public = false;
