-- Analysis of the notice a case is answering.
--
-- Kept as immutable versions for the same reason drafts are: an approval must
-- be traceable to the analysis it was built on. The row records which document
-- was read and which model read it, so a later dispute about what the system
-- concluded has an answer.
--
-- Document *content* is never stored here. The result is the structured
-- conclusion only; the notice itself stays in the vault under its own
-- retention clock.

create table if not exists public.case_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.workflow_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.secure_documents(id) on delete cascade,
  version integer not null check (version >= 1),
  model text not null check (length(model) between 1 and 128),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (case_id, version)
);

create index if not exists case_analyses_case_idx
  on public.case_analyses(case_id, version desc);

alter table public.case_analyses enable row level security;

create policy "owners read their analyses"
  on public.case_analyses for select to authenticated
  using (owner_id = auth.uid());

-- Analyses are written by the server operation that performed the disclosure to
-- the model, never by a browser session claiming a conclusion was reached.
revoke all on public.case_analyses from anon, authenticated;
grant select on public.case_analyses to authenticated;

create trigger case_analyses_immutable
  before update or delete on public.case_analyses
  for each row execute function public.reject_immutable_security_records();

-- Records an analysis and advances the case, refusing a document that is not
-- clean, not on this case, or not the caller's.
create or replace function public.record_case_analysis(
  p_case_id uuid,
  p_document_id uuid,
  p_model text,
  p_result jsonb
)
returns public.case_analyses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_version integer;
  v_analysis public.case_analyses;
begin
  select c.owner_id into v_owner from public.workflow_cases c where c.id = p_case_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'case not found' using errcode = 'no_data_found';
  end if;

  if not exists (
    select 1
    from public.case_documents cd
    join public.secure_documents d on d.id = cd.document_id
    where cd.case_id = p_case_id
      and cd.document_id = p_document_id
      and d.owner_id = v_owner
      and d.security_status = 'clean'
      and d.deleted_at is null
      and d.deletion_requested_at is null
  ) then
    raise exception 'document is not an analysable document on this case'
      using errcode = 'raise_exception';
  end if;

  select coalesce(max(a.version), 0) + 1 into v_version
  from public.case_analyses a where a.case_id = p_case_id;

  insert into public.case_analyses (case_id, owner_id, document_id, version, model, result)
  values (p_case_id, v_owner, p_document_id, v_version, p_model, p_result)
  returning * into v_analysis;

  update public.workflow_cases set status = 'analyzed'
  where id = p_case_id and status = 'intake';

  return v_analysis;
end;
$$;

revoke all on function public.record_case_analysis(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.record_case_analysis(uuid, uuid, text, jsonb)
  to authenticated, service_role;
