-- Debt-validation persistence foundation. REVIEW ONLY: adding this file does
-- not apply it to any hosted database or activate a workflow/provider.
-- The host must authenticate the user, derive owner_id server-side and use
-- a transactional PostgreSQL connection. Service-role access bypasses RLS.
begin;

create table public.debt_validation_matter_snapshots (
  owner_id uuid not null references auth.users(id) on delete cascade,
  matter_id text not null check (length(btrim(matter_id)) between 1 and 128),
  current_intake jsonb not null check (jsonb_typeof(current_intake) = 'object'),
  trusted_notice jsonb not null check (jsonb_typeof(trusted_notice) = 'object'),
  packet jsonb not null check (jsonb_typeof(packet) = 'object'),
  pdf_bytes bytea not null check (octet_length(pdf_bytes) between 1 and 52428800),
  notice_pdf_bytes bytea not null check (octet_length(notice_pdf_bytes) between 1 and 52428800),
  approval jsonb check (approval is null or jsonb_typeof(approval) = 'object'),
  checkout_key text unique
    check (checkout_key is null or checkout_key ~ '^debt_validation_checkout_[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_id, matter_id),
  unique (owner_id, matter_id, checkout_key),
  check (checkout_key is null or approval is not null),
  check ((trusted_notice->>'ownerId' = owner_id::text) is true
    and (trusted_notice->>'matterId' = matter_id) is true),
  check ((packet->>'ownerId' = owner_id::text) is true
    and (packet->>'matterId' = matter_id) is true)
);

-- Prevent a privileged caller from seeding a matter already approved or
-- checked out. Creation and customer consent must be separate durable stages;
-- the approval/checkout UPDATE path performs its own atomic validation.
create function public.guard_debt_validation_snapshot_insert()
returns trigger language plpgsql set search_path = public as $insert_guard$
begin
  if new.approval is not null or new.checkout_key is not null then
    raise exception 'debt_validation_initial_approval_forbidden';
  end if;
  return new;
end;
$insert_guard$;

create trigger debt_validation_snapshot_insert_guard
  before insert on public.debt_validation_matter_snapshots
  for each row execute function public.guard_debt_validation_snapshot_insert();

-- The exact controlling notice, intake and reviewed packet are create-only.
-- Only a first approval and a subsequent one-time checkout claim may change.
-- This is defense in depth against stale writes, including service-role code.
create function public.guard_debt_validation_snapshot_update()
returns trigger language plpgsql set search_path = public as $guard$
begin
  if row(new.owner_id, new.matter_id, new.current_intake, new.trusted_notice,
         new.packet, new.pdf_bytes, new.notice_pdf_bytes)
     is distinct from
     row(old.owner_id, old.matter_id, old.current_intake, old.trusted_notice,
         old.packet, old.pdf_bytes, old.notice_pdf_bytes) then
    raise exception 'debt_validation_immutable_packet_identity';
  end if;
  if old.approval is not null and new.approval is distinct from old.approval then
    raise exception 'debt_validation_immutable_approval';
  end if;
  if old.checkout_key is not null
     and new.checkout_key is distinct from old.checkout_key then
    raise exception 'debt_validation_immutable_checkout_claim';
  end if;
  if old.approval is null and new.checkout_key is not null then
    raise exception 'debt_validation_approval_must_precede_checkout';
  end if;
  return new;
end;
$guard$;

create trigger debt_validation_snapshot_guard
  before update on public.debt_validation_matter_snapshots
  for each row execute function public.guard_debt_validation_snapshot_update();

-- Composite foreign keys tie every receipt/handoff to the exact persisted
-- checkout claim; a separate owner or unapproved matter cannot borrow it.
create table public.debt_validation_mailing_handoffs (
  owner_id uuid not null,
  matter_id text not null,
  checkout_key text not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, matter_id),
  constraint debt_validation_handoff_checkout_fk
    foreign key (owner_id, matter_id, checkout_key)
    references public.debt_validation_matter_snapshots(owner_id, matter_id, checkout_key)
    on delete cascade
);

create table public.debt_validation_checkout_receipts (
  owner_id uuid not null,
  matter_id text not null,
  checkout_key text not null,
  kind text not null check (kind in ('payment', 'mailing')),
  provider text not null check (provider ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$'),
  provider_reference text not null
    check (length(btrim(provider_reference)) between 1 and 256),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (owner_id, matter_id, checkout_key, kind),
  constraint debt_validation_receipt_checkout_fk
    foreign key (owner_id, matter_id, checkout_key)
    references public.debt_validation_matter_snapshots(owner_id, matter_id, checkout_key)
    on delete cascade
);

-- A payment intent or mailing reference cannot certify two different orders,
-- even when provider capitalization differs and callbacks race.
create unique index debt_validation_provider_receipt_unique
  on public.debt_validation_checkout_receipts
  (kind, lower(provider), provider_reference);

-- The SQL ledger must enforce the same payment-before-mailing boundary as
-- the server adapter. A service-role caller cannot insert a mailing handoff
-- or mailing acknowledgement by bypassing the application-level guard.
-- A checkout claim alone is NOT verified payment or mailing authorization.
create function public.require_debt_validation_paid_mailing_stage()
returns trigger language plpgsql set search_path = public as $paid_mail$
begin
  if not exists (
    select 1 from public.debt_validation_checkout_receipts
    where owner_id = new.owner_id and matter_id = new.matter_id
      and checkout_key = new.checkout_key and kind = 'payment'
  ) then
    raise exception 'debt_validation_verified_payment_required';
  end if;
  if TG_TABLE_NAME = 'debt_validation_checkout_receipts' and not exists (
    select 1 from public.debt_validation_mailing_handoffs
    where owner_id = new.owner_id and matter_id = new.matter_id
      and checkout_key = new.checkout_key
  ) then
    raise exception 'debt_validation_mailing_handoff_required';
  end if;
  return new;
end;
$paid_mail$;

create trigger debt_validation_handoff_requires_payment
  before insert on public.debt_validation_mailing_handoffs
  for each row execute function public.require_debt_validation_paid_mailing_stage();
create trigger debt_validation_mailing_receipt_requires_handoff
  before insert on public.debt_validation_checkout_receipts
  for each row when (new.kind = 'mailing')
  execute function public.require_debt_validation_paid_mailing_stage();

-- Once acknowledged, receipts and handoffs cannot be silently rewritten.
-- Deletes remain server-only for separately reviewed retention handling.
create function public.reject_debt_validation_ledger_update()
returns trigger language plpgsql set search_path = public as $ledger$
begin
  raise exception 'debt_validation_immutable_provider_evidence';
end;
$ledger$;

create trigger debt_validation_handoff_immutable
  before update on public.debt_validation_mailing_handoffs
  for each row execute function public.reject_debt_validation_ledger_update();
create trigger debt_validation_receipt_immutable
  before update on public.debt_validation_checkout_receipts
  for each row execute function public.reject_debt_validation_ledger_update();

-- RLS is defense in depth. No browser role may write approval, payment,
-- handoff or receipt evidence. Trusted server writes must still verify owner.
alter table public.debt_validation_matter_snapshots enable row level security;
alter table public.debt_validation_mailing_handoffs enable row level security;
alter table public.debt_validation_checkout_receipts enable row level security;
revoke all on public.debt_validation_matter_snapshots from public, anon, authenticated;
revoke all on public.debt_validation_mailing_handoffs from public, anon, authenticated;
revoke all on public.debt_validation_checkout_receipts from public, anon, authenticated;
grant select on public.debt_validation_matter_snapshots to authenticated;
grant select on public.debt_validation_mailing_handoffs to authenticated;
grant select on public.debt_validation_checkout_receipts to authenticated;
grant all on public.debt_validation_matter_snapshots to service_role;
grant all on public.debt_validation_mailing_handoffs to service_role;
grant all on public.debt_validation_checkout_receipts to service_role;
create policy debt_validation_matter_owner_read
  on public.debt_validation_matter_snapshots for select to authenticated
  using (owner_id = auth.uid());
create policy debt_validation_handoff_owner_read
  on public.debt_validation_mailing_handoffs for select to authenticated
  using (owner_id = auth.uid());
create policy debt_validation_receipt_owner_read
  on public.debt_validation_checkout_receipts for select to authenticated
  using (owner_id = auth.uid());
revoke all on function public.guard_debt_validation_snapshot_insert()
  from public, anon, authenticated;
revoke all on function public.guard_debt_validation_snapshot_update()
  from public, anon, authenticated;
revoke all on function public.reject_debt_validation_ledger_update()
  from public, anon, authenticated;
revoke all on function public.require_debt_validation_paid_mailing_stage()
  from public, anon, authenticated;
commit;
