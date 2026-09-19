-- Security-first document intake. Objects enter quarantine and are owner-scoped.

create table if not exists public.document_consents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null check (length(workflow_id) between 1 and 128),
  purpose text not null check (purpose ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  consent_version text not null,
  consented_at timestamptz not null default now()
);

create table if not exists public.secure_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null check (length(workflow_id) between 1 and 128),
  consent_id uuid not null references public.document_consents(id),
  original_filename text check (original_filename is null or length(original_filename) between 1 and 255),
  safe_filename text check (safe_filename is null or length(safe_filename) between 1 and 255),
  storage_path text not null unique,
  mime_type text check (mime_type is null or mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'text/plain')),
  size_bytes bigint check (size_bytes is null or (size_bytes > 0 and size_bytes <= 52428800)),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  security_status text not null default 'quarantined'
    check (security_status in ('quarantined', 'scanning', 'clean', 'rejected', 'deleting', 'deleted')),
  scanner_name text,
  scanner_result jsonb,
  scanned_at timestamptz,
  scan_attempts integer not null default 0 check (scan_attempts between 0 and 10),
  last_scan_error text,
  deletion_attempts integer not null default 0 check (deletion_attempts between 0 and 10),
  last_deletion_error text,
  retention_until timestamptz not null default (now() + interval '30 days'),
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint storage_path_owned check (storage_path like owner_id::text || '/%'),
  constraint active_document_metadata check (
    security_status = 'deleted'
    or (original_filename is not null and safe_filename is not null and mime_type is not null
      and size_bytes is not null and sha256 is not null)
  )
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  owner_id uuid references auth.users(id) on delete set null,
  document_id uuid references public.secure_documents(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists secure_documents_owner_workflow_idx
  on public.secure_documents(owner_id, workflow_id, created_at desc);
create index if not exists secure_documents_retention_idx
  on public.secure_documents(retention_until)
  where deleted_at is null;

alter table public.document_consents enable row level security;
alter table public.secure_documents enable row level security;
alter table public.security_events enable row level security;

create policy "owners insert document consent"
  on public.document_consents for insert to authenticated
  with check (owner_id = auth.uid());
create policy "owners read document consent"
  on public.document_consents for select to authenticated
  using (owner_id = auth.uid());

create policy "owners register quarantined documents"
  on public.secure_documents for insert to authenticated
  with check (
    owner_id = auth.uid()
    and security_status = 'quarantined'
    and original_filename is not null
    and safe_filename is not null
    and mime_type is not null
    and size_bytes is not null
    and sha256 is not null
    and storage_path like auth.uid()::text || '/%'
    and exists (
      select 1 from public.document_consents c
      where c.id = consent_id and c.owner_id = auth.uid()
    )
  );
create policy "owners read document metadata"
  on public.secure_documents for select to authenticated
  using (owner_id = auth.uid() and security_status <> 'deleted');

-- Users may see their audit trail but may not manufacture or edit events.
create policy "owners read security events"
  on public.security_events for select to authenticated
  using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'secure-documents',
  'secure-documents',
  false,
  52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners upload to their quarantine prefix"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'secure-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "owners remove their quarantined objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'secure-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No authenticated-user SELECT policy exists on storage.objects. A controlled
-- server operation may issue short-lived downloads only after status = 'clean'.
-- Only trusted scanner/retention workers (service role) can update status.

create or replace function public.reject_immutable_security_records()
returns trigger language plpgsql as $$
begin
  raise exception 'security records are immutable';
end;
$$;

create trigger document_consents_immutable
  before update or delete on public.document_consents
  for each row execute function public.reject_immutable_security_records();
create trigger security_events_immutable
  before update or delete on public.security_events
  for each row execute function public.reject_immutable_security_records();

create or replace function public.audit_secure_document_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.security_status is distinct from new.security_status then
    insert into public.security_events(owner_id, document_id, event_type, metadata)
    values (
      new.owner_id,
      new.id,
      'document.security_status_changed',
      jsonb_build_object('from', old.security_status, 'to', new.security_status)
    );
  end if;
  return new;
end;
$$;

create trigger audit_secure_document_status_change
  after update of security_status on public.secure_documents
  for each row execute function public.audit_secure_document_status();

revoke all on public.document_consents from anon;
revoke all on public.secure_documents from anon;
revoke all on public.security_events from anon;
grant select, insert on public.document_consents to authenticated;
grant select, insert on public.secure_documents to authenticated;
grant select on public.security_events to authenticated;

-- Atomically claims quarantined work so concurrent scanner jobs cannot process
-- the same object. This function is unavailable to browser roles.
create or replace function public.claim_secure_documents_for_scan(batch_limit integer default 10)
returns setof public.secure_documents
language plpgsql
security definer
set search_path = public
as $$
begin
  if batch_limit < 1 or batch_limit > 25 then
    raise exception 'batch_limit must be between 1 and 25';
  end if;

  return query
  with candidates as (
    select id
    from public.secure_documents
    where security_status = 'quarantined'
      and scan_attempts < 10
      and deleted_at is null
    order by created_at
    for update skip locked
    limit batch_limit
  )
  update public.secure_documents d
  set security_status = 'scanning',
      scan_attempts = d.scan_attempts + 1,
      last_scan_error = null
  from candidates c
  where d.id = c.id
  returning d.*;
end;
$$;

revoke all on function public.claim_secure_documents_for_scan(integer) from public, anon, authenticated;
grant execute on function public.claim_secure_documents_for_scan(integer) to service_role;

-- Mark expired content inaccessible before object deletion. Rows left in
-- `deleting` after an infrastructure failure are reclaimed on the next run.
create or replace function public.claim_secure_documents_for_deletion(batch_limit integer default 50)
returns setof public.secure_documents
language plpgsql
security definer
set search_path = public
as $$
begin
  if batch_limit < 1 or batch_limit > 100 then
    raise exception 'batch_limit must be between 1 and 100';
  end if;

  return query
  with candidates as (
    select id
    from public.secure_documents
    where (
        ((retention_until <= now() or deletion_requested_at is not null)
          and security_status not in ('scanning', 'deleted'))
        or security_status = 'deleting'
      )
      and deletion_attempts < 10
      and deleted_at is null
    order by retention_until
    for update skip locked
    limit batch_limit
  )
  update public.secure_documents d
  set security_status = 'deleting',
      deletion_attempts = d.deletion_attempts + 1,
      last_deletion_error = null
  from candidates c
  where d.id = c.id
  returning d.*;
end;
$$;

revoke all on function public.claim_secure_documents_for_deletion(integer) from public, anon, authenticated;
grant execute on function public.claim_secure_documents_for_deletion(integer) to service_role;

-- A user deletion request revokes access immediately unless a scanner has the
-- row claimed. In that case the scanner observes deletion_requested_at and
-- hands the row to the deletion worker instead of releasing it.
create or replace function public.request_secure_document_deletion(document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.secure_documents
  set deletion_requested_at = coalesce(deletion_requested_at, now()),
      security_status = case
        when security_status = 'scanning' then 'scanning'
        else 'deleting'
      end
  where id = document_id
    and owner_id = auth.uid()
    and security_status <> 'deleted';

  get diagnostics affected = row_count;
  if affected = 1 then
    insert into public.security_events(owner_id, document_id, event_type, metadata)
    values (auth.uid(), document_id, 'document.deletion_requested', '{}'::jsonb);
  end if;
  return affected = 1;
end;
$$;

revoke all on function public.request_secure_document_deletion(uuid) from public, anon;
grant execute on function public.request_secure_document_deletion(uuid) to authenticated;
