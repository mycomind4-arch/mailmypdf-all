-- Owned recovery outcomes above existing matters; this migration enables no provider action.
create schema if not exists private;
create function private.recovery_money_valid(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='object' and jsonb_typeof(v->'amountMinor')='number'
 and (v->>'amountMinor')::numeric between 0 and 9007199254740991
 and trunc((v->>'amountMinor')::numeric)=(v->>'amountMinor')::numeric and v->>'currency' ~ '^[A-Z]{3}$',false);
$$;
create table public.recovery_case_goals (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 creation_key text not null check(creation_key ~ '^[A-Za-z0-9._:-]{8,128}$'),
 request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
 source jsonb not null check(jsonb_typeof(source)='object' and octet_length(source::text)<=131072),
 goal jsonb not null check(jsonb_typeof(goal)='object' and octet_length(goal::text)<=131072),
 state text generated always as (goal->>'state') stored,
 revision integer generated always as ((goal->>'revision')::integer) stored,
 created_at timestamptz not null default now(), unique(id,owner_id),unique(owner_id,creation_key)
);
create index recovery_goals_owner_updated_idx on public.recovery_case_goals(owner_id,(goal->>'updatedAt') desc,id);
create table public.recovery_provider_connections (
 id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider='gmail'),account_subject text not null check(length(trim(account_subject)) between 1 and 512),
 email text not null check(length(email) between 3 and 254 and email !~ E'[\\r\\n]'),
 scopes text[] not null check(cardinality(scopes) between 1 and 16 and array_position(scopes,null) is null),status text not null default 'active' check(status in ('active','revoked')),
 revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,owner_id),unique(owner_id,provider,account_subject)
);
create index recovery_connections_owner_idx on public.recovery_provider_connections(owner_id,status,id);
-- Only a reference to an encrypted server secret store, never token bytes.
create table private.recovery_provider_credentials (
 connection_id uuid primary key,owner_id uuid not null,credential_ref text not null check(length(trim(credential_ref)) between 1 and 1024),
 foreign key(connection_id,owner_id) references public.recovery_provider_connections(id,owner_id) on delete cascade
);
create table public.recovery_action_approvals (
 id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,case_id uuid not null,connection_id uuid not null,
 request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
 review jsonb not null check(jsonb_typeof(review)='object' and octet_length(review::text)<=8192),input jsonb not null check(octet_length(input::text)<=262144),
 status text not null default 'proposed' check(status in ('proposed','approved','revoked')),approved_by uuid,approved_at timestamptz,expires_at timestamptz,
 created_at timestamptz not null default now(),unique(id,owner_id),
 foreign key(case_id,owner_id) references public.recovery_case_goals(id,owner_id) on delete cascade,
 foreign key(connection_id,owner_id) references public.recovery_provider_connections(id,owner_id),
 constraint recovery_approval_state check(
 (status='proposed' and approved_by is null and approved_at is null and expires_at is null)
 or (status in ('approved','revoked') and approved_by is not null and approved_by=owner_id and approved_at is not null and expires_at is not null and expires_at>approved_at)
 or (status='revoked' and approved_by is null and approved_at is null and expires_at is null))
);
create index recovery_approvals_owner_case_idx on public.recovery_action_approvals(owner_id,case_id,created_at desc);
create table public.recovery_action_executions (
 owner_id uuid not null references auth.users(id) on delete cascade,idempotency_key text not null check(length(trim(idempotency_key)) between 1 and 256),
 case_id uuid not null,connection_id uuid not null,approval_id uuid,request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
 record jsonb not null check(jsonb_typeof(record)='object' and octet_length(record::text)<=262144),
 state text generated always as (record->>'state') stored,revision integer generated always as ((record->>'revision')::integer) stored,
 primary key(owner_id,idempotency_key),foreign key(case_id,owner_id) references public.recovery_case_goals(id,owner_id) on delete cascade,
 foreign key(connection_id,owner_id) references public.recovery_provider_connections(id,owner_id),
 foreign key(approval_id,owner_id) references public.recovery_action_approvals(id,owner_id)
);
create index recovery_executions_case_idx on public.recovery_action_executions(case_id,owner_id);
create index recovery_executions_connection_idx on public.recovery_action_executions(connection_id,owner_id);
create index recovery_executions_approval_idx on public.recovery_action_executions(approval_id,owner_id);
create function private.enforce_recovery_goal() returns trigger language plpgsql set search_path='' as $$
declare g jsonb:=new.goal; o jsonb; value text; r jsonb; stamp timestamptz;
begin
 if g->>'schema' is distinct from 'mailmypdf.case-goal/v1' or g->>'id' is distinct from new.id::text or g->>'ownerId' is distinct from new.owner_id::text
 or coalesce(length(trim(g->>'objective')),0) not between 1 and 4000 or coalesce(length(trim(g->>'desiredOutcome')),0) not between 1 and 4000
 or coalesce(length(trim(g->>'category')),0) not between 1 and 100 or (g ? 'subject' and coalesce(length(trim(g->>'subject')),0) not between 1 and 500)
 or coalesce(g->>'state','') not in ('intake','active','waiting','resolved','cancelled') or jsonb_typeof(g->'revision') is distinct from 'number'
 or (g->>'revision')::numeric<1 or trunc((g->>'revision')::numeric)<>(g->>'revision')::numeric
 or jsonb_typeof(g->'evidenceIds') is distinct from 'array' or jsonb_typeof(g->'matterIds') is distinct from 'array' or jsonb_typeof(g->'actionKeys') is distinct from 'array'
 or jsonb_array_length(g->'evidenceIds')>1000 or jsonb_array_length(g->'matterIds')>1000 or jsonb_array_length(g->'actionKeys')>1000
 or g->>'createdAt' is null or g->>'updatedAt' is null or (g->>'updatedAt')::timestamptz<(g->>'createdAt')::timestamptz
 or (g ? 'soughtValue' and not private.recovery_money_valid(g->'soughtValue')) then raise exception 'invalid recovery goal identity or fields'; end if;
 stamp:=(g->>'updatedAt')::timestamptz;
 if (g->>'state'='waiting') is distinct from (g ? 'waiting') or (g->>'state'='resolved') is distinct from (g ? 'resolution') then raise exception 'invalid recovery goal state payload'; end if;
 if g->>'state'='waiting' and (coalesce(length(trim(g#>>'{waiting,reason}')),0) not between 1 and 4000
 or (g#>>'{waiting,dueAt}' is not null and (TG_OP='INSERT' or old.goal->>'state'<>'waiting' or g#>>'{waiting,dueAt}' is distinct from old.goal#>>'{waiting,dueAt}') and (g#>>'{waiting,dueAt}')::timestamptz<=stamp)) then raise exception 'invalid recovery waiting deadline'; end if;
 if TG_OP='INSERT' then
  if g->>'state'<>'intake' or (g->>'revision')::integer<>1 or g->'evidenceIds'<>'[]'::jsonb or g->'matterIds'<>'[]'::jsonb or g->'actionKeys'<>'[]'::jsonb then raise exception 'invalid initial recovery goal'; end if;
 else
  o:=old.goal;
  if new.id<>old.id or new.owner_id<>old.owner_id or new.creation_key<>old.creation_key or new.request_sha256<>old.request_sha256 or new.source<>old.source or new.created_at<>old.created_at
  or (g-'state'-'revision'-'updatedAt'-'evidenceIds'-'matterIds'-'actionKeys'-'waiting'-'resolution') is distinct from (o-'state'-'revision'-'updatedAt'-'evidenceIds'-'matterIds'-'actionKeys'-'waiting'-'resolution') then raise exception 'recovery goal identity is immutable'; end if;
  if o->>'state' in ('resolved','cancelled') then raise exception 'recovery goal is terminal'; end if;
  if (g->>'revision')::integer<>(o->>'revision')::integer+1 then raise exception 'recovery goal revision conflict'; end if;
  if stamp<(o->>'updatedAt')::timestamptz then raise exception 'recovery goal time regression'; end if;
  if not (g->>'state'=o->>'state' or (o->>'state'='intake' and g->>'state' in ('active','cancelled')) or (o->>'state'='active' and g->>'state' in ('waiting','resolved','cancelled')) or (o->>'state'='waiting' and g->>'state' in ('active','resolved','cancelled'))) then raise exception 'invalid recovery goal transition'; end if;
  if not ((g->'evidenceIds') @> (o->'evidenceIds') and (g->'matterIds') @> (o->'matterIds') and (g->'actionKeys') @> (o->'actionKeys')) then raise exception 'recovery links cannot be removed'; end if;
 end if;
 for value in select jsonb_array_elements_text(g->'evidenceIds') loop
  if not exists(select 1 from public.secure_documents d where d.id::text=value and d.owner_id=new.owner_id) then raise exception 'recovery evidence ownership required'; end if;
 end loop;
 for value in select jsonb_array_elements_text(g->'matterIds') loop
  if not exists(select 1 from public.workflow_cases c where c.id::text=value and c.owner_id=new.owner_id) then raise exception 'recovery matter ownership required'; end if;
 end loop;
 for value in select jsonb_array_elements_text(g->'actionKeys') loop
  if not exists(select 1 from public.recovery_action_executions a where a.idempotency_key=value and a.owner_id=new.owner_id and a.case_id=new.id) then raise exception 'recovery action ownership required'; end if;
 end loop;
 if g->>'state'='resolved' then
  r:=g->'resolution';
  if coalesce(length(trim(r->>'outcome')),0) not between 1 and 4000 or r->>'confirmedBy' is distinct from new.owner_id::text
  or jsonb_typeof(r->'evidenceIds') is distinct from 'array' or jsonb_array_length(r->'evidenceIds')<1 or not ((old.goal->'evidenceIds') @> (r->'evidenceIds')) then raise exception 'owned linked resolution evidence required'; end if;
  if r ? 'recoveredValue' and (not private.recovery_money_valid(r->'recoveredValue') or (g ? 'soughtValue' and r#>>'{recoveredValue,currency}' is distinct from g#>>'{soughtValue,currency}')) then raise exception 'invalid recovery resolution money'; end if;
 end if;
 return new;
end $$;
create trigger enforce_recovery_goal before insert or update on public.recovery_case_goals for each row execute function private.enforce_recovery_goal();
create function private.enforce_recovery_connection() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if new.status<>'active' or new.revision<>1 then raise exception 'invalid initial recovery connection'; end if;
 else
  if new.id<>old.id or new.owner_id<>old.owner_id or new.provider<>old.provider or new.account_subject<>old.account_subject or new.email<>old.email or new.created_at<>old.created_at then raise exception 'recovery connection identity is immutable'; end if;
  if old.status='revoked' then raise exception 'recovery connection is revoked'; end if;
  if new.revision<>old.revision+1 or new.updated_at<old.updated_at then raise exception 'recovery connection revision conflict'; end if;
 end if;
 return new;
end $$;
create trigger enforce_recovery_connection before insert or update on public.recovery_provider_connections for each row execute function private.enforce_recovery_connection();
create function private.enforce_recovery_approval() returns trigger language plpgsql set search_path='' as $$
begin
 if new.review->>'ownerId' is distinct from new.owner_id::text or new.review->>'actorId' is distinct from new.owner_id::text or new.review->>'caseId' is distinct from new.case_id::text
 or new.review->>'connectionId' is distinct from new.connection_id::text or new.review->>'requestSha256' is distinct from new.request_sha256
 or new.review->'requiresApproval' is distinct from 'true'::jsonb or coalesce(new.review->>'effect','none') not in ('email','storage','browser','payment','mailing') then raise exception 'invalid recovery approval identity'; end if;
 if TG_OP='INSERT' then
  if new.status<>'proposed' or new.approved_by is not null or new.approved_at is not null or new.expires_at is not null then raise exception 'approval must begin as a proposal'; end if;
 else
  if new.id<>old.id or new.owner_id<>old.owner_id or new.case_id<>old.case_id or new.connection_id<>old.connection_id or new.request_sha256<>old.request_sha256 or new.review<>old.review or new.input<>old.input or new.created_at<>old.created_at then raise exception 'approval identity and input are immutable'; end if;
  if old.status='revoked' then raise exception 'approval is revoked'; end if;
  if not ((old.status='proposed' and new.status in ('approved','revoked')) or (old.status='approved' and new.status='revoked')) then raise exception 'invalid approval transition'; end if;
  if old.status='approved' and (new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at or new.expires_at is distinct from old.expires_at) then raise exception 'approval evidence is immutable'; end if;
  if new.status='approved' and (new.approved_by is distinct from new.owner_id or new.approved_at is null or new.expires_at is null or new.approved_at>now() or new.expires_at<=now() or new.expires_at>new.approved_at+interval '24 hours') then raise exception 'invalid approval confirmation'; end if;
 end if;
 return new;
end $$;
create trigger enforce_recovery_approval before insert or update on public.recovery_action_approvals for each row execute function private.enforce_recovery_approval();
create function private.enforce_recovery_execution() returns trigger language plpgsql set search_path='' as $$
declare r jsonb:=new.record; v jsonb:=new.record->'review'; c public.recovery_provider_connections; a public.recovery_action_approvals; goal_state text; required_scope text; expected_effect text;
begin
 if v->>'ownerId' is distinct from new.owner_id::text or v->>'actorId' is distinct from new.owner_id::text or v->>'caseId' is distinct from new.case_id::text
 or v->>'connectionId' is distinct from new.connection_id::text or v->>'idempotencyKey' is distinct from new.idempotency_key or v->>'requestSha256' is distinct from new.request_sha256
 or r->>'approvalId' is distinct from new.approval_id::text or coalesce(r->>'state','') not in ('running','succeeded','failed','needs_review')
 or jsonb_typeof(r->'revision') is distinct from 'number' or (r->>'revision')::numeric<>trunc((r->>'revision')::numeric)
 or r->>'startedAt' is null or r->>'updatedAt' is null or (r->>'updatedAt')::timestamptz<(r->>'startedAt')::timestamptz then raise exception 'invalid recovery action identity or fingerprint'; end if;
 if (r->>'state'='running' and (r ? 'output' or r ? 'errorCode')) or (r->>'state'='succeeded' and (not (r ? 'output') or r ? 'errorCode'))
 or (r->>'state' in ('failed','needs_review') and (r ? 'output' or coalesce(length(r->>'errorCode'),0)=0)) then raise exception 'invalid recovery action state payload'; end if;
 if TG_OP='INSERT' then
  select * into c from public.recovery_provider_connections where id=new.connection_id and owner_id=new.owner_id for share;
  if c.id is null or c.status<>'active' then raise exception 'active owned recovery connection required'; end if;
  -- Recheck the current scope while holding the connection lock: revocation may race host authorization.
  required_scope:=case v->>'tool'
   when 'email.search' then 'https://www.googleapis.com/auth/gmail.readonly'
   when 'email.read' then 'https://www.googleapis.com/auth/gmail.readonly'
   when 'email.draft' then 'https://www.googleapis.com/auth/gmail.compose'
   when 'email.send' then 'https://www.googleapis.com/auth/gmail.send' end;
  expected_effect:=case v->>'tool' when 'email.search' then 'none' when 'email.read' then 'none' when 'email.draft' then 'storage' when 'email.send' then 'email' end;
  if required_scope is null or (required_scope=any(c.scopes)) is distinct from true or v->'version' is distinct from '1'::jsonb
   or v->>'effect' is distinct from expected_effect or v->'requiresApproval' is distinct from to_jsonb(expected_effect<>'none') then raise exception 'recovery action scope or policy denied'; end if;
  select state into goal_state from public.recovery_case_goals where id=new.case_id and owner_id=new.owner_id for share;
  if goal_state is null or goal_state in ('resolved','cancelled') then raise exception 'open owned recovery goal required'; end if;
  if r->>'state'<>'running' or (r->>'revision')::integer<>1 then raise exception 'invalid initial recovery action'; end if;
  if v->'requiresApproval'='true'::jsonb then
   select * into a from public.recovery_action_approvals where id=new.approval_id and owner_id=new.owner_id for share;
   if a.id is null or a.status<>'approved' or a.approved_by<>new.owner_id or a.expires_at<=now() or a.approved_at>now() or a.review<>v or a.request_sha256<>new.request_sha256 then raise exception 'live exact approval required'; end if;
  elsif v->'requiresApproval' is distinct from 'false'::jsonb or v->>'effect' is distinct from 'none' or new.approval_id is not null then raise exception 'action effect requires approval'; end if;
 else
  if new.owner_id<>old.owner_id or new.idempotency_key<>old.idempotency_key or new.case_id<>old.case_id or new.connection_id<>old.connection_id
  or new.approval_id is distinct from old.approval_id or new.request_sha256<>old.request_sha256 or v<>old.record->'review' or r->>'startedAt'<>old.record->>'startedAt' then raise exception 'recovery action identity is immutable'; end if;
  if old.record->>'state'<>'running' then raise exception 'recovery action is terminal'; end if;
  if (r->>'revision')::integer<>(old.record->>'revision')::integer+1 or r->>'state'='running' or (r->>'updatedAt')::timestamptz<(old.record->>'updatedAt')::timestamptz then raise exception 'invalid recovery action transition'; end if;
  if (r->>'state'='failed' and v->>'effect'<>'none') or (r->>'state'='needs_review' and v->>'effect'='none') then raise exception 'ambiguous writes require review'; end if;
 end if;
 return new;
end $$;
create trigger enforce_recovery_execution before insert or update on public.recovery_action_executions for each row execute function private.enforce_recovery_execution();
alter table public.recovery_case_goals enable row level security;
alter table public.recovery_provider_connections enable row level security;
alter table public.recovery_action_approvals enable row level security;
alter table public.recovery_action_executions enable row level security;
alter table private.recovery_provider_credentials enable row level security;
create policy recovery_goals_owner_read on public.recovery_case_goals for select to authenticated using(owner_id=(select auth.uid()));
create policy recovery_connections_owner_read on public.recovery_provider_connections for select to authenticated using(owner_id=(select auth.uid()));
create policy recovery_approvals_owner_read on public.recovery_action_approvals for select to authenticated using(owner_id=(select auth.uid()));
create policy recovery_executions_owner_read on public.recovery_action_executions for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.recovery_case_goals,public.recovery_provider_connections,public.recovery_action_approvals,public.recovery_action_executions from public,anon,authenticated;
grant select on public.recovery_case_goals,public.recovery_provider_connections,public.recovery_action_approvals,public.recovery_action_executions to authenticated;
grant all on public.recovery_case_goals,public.recovery_provider_connections,public.recovery_action_approvals,public.recovery_action_executions to service_role;
revoke all on private.recovery_provider_credentials from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.recovery_provider_credentials to service_role;
revoke all on function private.recovery_money_valid(jsonb),private.enforce_recovery_goal(),private.enforce_recovery_connection(),private.enforce_recovery_approval(),private.enforce_recovery_execution() from public,anon,authenticated;
grant execute on function private.recovery_money_valid(jsonb),private.enforce_recovery_goal(),private.enforce_recovery_connection(),private.enforce_recovery_approval(),private.enforce_recovery_execution() to service_role;
