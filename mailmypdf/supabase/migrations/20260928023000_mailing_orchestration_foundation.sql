-- Shared mailing orchestration foundation.
-- Additive only. This migration is intentionally NOT coupled to provider
-- submission: scheduled and batch records describe approved intent, while
-- existing payment/fulfillment paths remain authoritative for external effects.
--
-- Do not store raw card data here. Stripe customer/payment-method references are
-- server-only tokens and are never exposed through the MCP surface.

begin;

alter table public.orders
  add column if not exists payment_execution_key text;

comment on column public.orders.payment_execution_key is
  'Server-only compare-and-set claim preventing hosted checkout and scheduled saved-payment execution from charging the same draft concurrently.';

create table public.account_billing_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  stripe_customer_id text unique,
  default_payment_method_id text,
  payment_brand text check (payment_brand is null or length(payment_brand) between 1 and 32),
  payment_last4 text check (payment_last4 is null or payment_last4 ~ '^[0-9]{4}$'),
  payment_ready boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    not payment_ready
    or (
      stripe_customer_id is not null
      and default_payment_method_id is not null
      and payment_brand is not null
      and payment_last4 is not null
    )
  )
);

comment on table public.account_billing_profiles is
  'Server-only tokenized billing profile. Never stores PAN/CVC or other raw card data.';

alter table public.account_billing_profiles enable row level security;
revoke all on public.account_billing_profiles from public, anon, authenticated;
grant all on public.account_billing_profiles to service_role;

create table public.document_source_provenance (
  document_id uuid primary key references public.secure_documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null
    check (source_kind in ('local_upload', 'conversation_attachment', 'google_drive', 'mailmypdf_library', 'external_provider')),
  use_role text not null check (use_role in ('primary', 'supporting')),
  source_provider text,
  source_id text not null check (length(btrim(source_id)) between 1 and 512),
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.document_source_provenance is
  'Opaque document origin metadata only. Provider credentials and fetch URLs are forbidden by the application contract.';

alter table public.document_source_provenance enable row level security;
revoke all on public.document_source_provenance from public, anon, authenticated;
grant select on public.document_source_provenance to authenticated;
grant all on public.document_source_provenance to service_role;
create policy document_source_provenance_read_owned on public.document_source_provenance
  for select to authenticated using (owner_id = auth.uid());

create table public.mailing_batches (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  mode text not null check (mode in ('identical', 'personalized')),
  sender jsonb not null check (jsonb_typeof(sender) = 'object'),
  mail_class text not null check (mail_class in ('standard', 'certified', 'registered')),
  color boolean not null default false,
  quantity integer not null check (quantity between 2 and 10000),
  pricing jsonb not null check (jsonb_typeof(pricing) = 'object'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'processing', 'completed', 'partial_failure', 'cancelled')),
  approved_manifest_sha256 text check (approved_manifest_sha256 is null or approved_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  approved_total_cents integer check (approved_total_cents is null or approved_total_cents >= 0),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  unique (id, owner_id),
  check (
    (approved_at is null and approved_manifest_sha256 is null and approved_total_cents is null)
    or
    (approved_at is not null and approved_manifest_sha256 = manifest_sha256 and approved_total_cents is not null)
  ),
  check (status in ('draft', 'cancelled') or approved_at is not null)
);

create index mailing_batches_owner_created_idx
  on public.mailing_batches(owner_id, created_at desc);

alter table public.mailing_batches enable row level security;
revoke all on public.mailing_batches from public, anon, authenticated;
grant select on public.mailing_batches to authenticated;
grant all on public.mailing_batches to service_role;
create policy mailing_batches_read_owned on public.mailing_batches
  for select to authenticated using (owner_id = auth.uid());

create table public.mailing_batch_items (
  id uuid primary key,
  batch_id uuid not null,
  owner_id uuid not null,
  recipient_key text not null check (length(btrim(recipient_key)) between 1 and 160),
  recipient jsonb not null check (jsonb_typeof(recipient) = 'object'),
  packet_sha256 text not null check (packet_sha256 ~ '^[0-9a-f]{64}$'),
  page_count integer not null check (page_count > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'prepared'
    check (status in ('prepared', 'submitted', 'tracking', 'delivered', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, recipient_key),
  foreign key (batch_id, owner_id)
    references public.mailing_batches(id, owner_id) on delete cascade
);

create unique index mailing_batch_items_order_uidx
  on public.mailing_batch_items(order_id) where order_id is not null;
create index mailing_batch_items_batch_idx
  on public.mailing_batch_items(batch_id, status);

alter table public.mailing_batch_items enable row level security;
revoke all on public.mailing_batch_items from public, anon, authenticated;
grant select on public.mailing_batch_items to authenticated;
grant all on public.mailing_batch_items to service_role;
create policy mailing_batch_items_read_owned on public.mailing_batch_items
  for select to authenticated using (owner_id = auth.uid());

create table public.scheduled_mailings (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  order_id uuid references public.orders(id) on delete cascade,
  batch_id uuid references public.mailing_batches(id) on delete cascade,
  send_at timestamptz not null,
  timezone text,
  approval_sha256 text not null check (approval_sha256 ~ '^[0-9a-f]{64}$'),
  approved_max_total_cents integer not null check (approved_max_total_cents >= 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'blocked', 'released', 'cancelled')),
  blocked_reason text,
  released_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  check ((order_id is not null) <> (batch_id is not null)),
  check ((status = 'released') = (released_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);

create index scheduled_mailings_due_idx
  on public.scheduled_mailings(send_at)
  where status = 'scheduled';
create index scheduled_mailings_owner_idx
  on public.scheduled_mailings(owner_id, created_at desc);

alter table public.scheduled_mailings enable row level security;
revoke all on public.scheduled_mailings from public, anon, authenticated;
grant select on public.scheduled_mailings to authenticated;
grant all on public.scheduled_mailings to service_role;
create policy scheduled_mailings_read_owned on public.scheduled_mailings
  for select to authenticated using (owner_id = auth.uid());

-- Once a batch is approved, its recipient/content/pricing identity is frozen.
-- Fulfillment may still attach an order id and advance per-piece status.
create or replace function public.freeze_approved_mailing_batch_items()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  approved timestamptz;
  target_batch_id uuid;
begin
  if tg_op = 'DELETE' then
    target_batch_id := old.batch_id;
  else
    target_batch_id := new.batch_id;
  end if;

  select approved_at into approved
    from public.mailing_batches
    where id = target_batch_id;

  if approved is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Cannot add recipients to an approved mailing batch';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Cannot remove recipients from an approved mailing batch';
  end if;
  if row(new.batch_id, new.owner_id, new.recipient_key, new.recipient,
         new.packet_sha256, new.page_count, new.unit_price_cents)
     is distinct from
     row(old.batch_id, old.owner_id, old.recipient_key, old.recipient,
         old.packet_sha256, old.page_count, old.unit_price_cents) then
    raise exception 'Approved mailing batch recipient details are immutable';
  end if;
  return new;
end;
$$;

create trigger mailing_batch_items_freeze_approved
  before insert or update or delete on public.mailing_batch_items
  for each row execute function public.freeze_approved_mailing_batch_items();

revoke all on function public.freeze_approved_mailing_batch_items() from public, anon, authenticated;
grant execute on function public.freeze_approved_mailing_batch_items() to service_role;

create or replace function public.claim_scheduled_mailing_payment(
  p_schedule_id uuid,
  p_owner_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $claim$
declare
  s public.scheduled_mailings%rowtype;
  o public.orders%rowtype;
  claim_key text;
begin
  select * into s
    from public.scheduled_mailings
    where id = p_schedule_id and owner_id = p_owner_id
    for update;

  if not found or s.order_id is null or s.batch_id is not null then
    raise exception 'Scheduled mailing not available' using errcode = '42501';
  end if;

  if s.status not in ('scheduled', 'processing') then
    raise exception 'Scheduled mailing is not active' using errcode = '40001';
  end if;
  if s.send_at > now() then
    raise exception 'Scheduled mailing is not due' using errcode = '40001';
  end if;

  claim_key := 'scheduled:' || s.id::text;

  select * into o from public.orders where id = s.order_id for update;
  if not found or o.status <> 'draft' then
    raise exception 'Order is no longer an unpaid draft' using errcode = '40001';
  end if;
  if o.stripe_session_id is not null then
    raise exception 'Hosted checkout already owns the payment path' using errcode = '40001';
  end if;
  if o.payment_execution_key is not null and o.payment_execution_key <> claim_key then
    raise exception 'Another payment execution owns this draft' using errcode = '40001';
  end if;
  if o.approved_packet_sha256 is distinct from s.approval_sha256
     or o.approved_price_cents is null
     or o.approved_price_cents > s.approved_max_total_cents then
    raise exception 'Scheduled approval no longer matches the order' using errcode = '40001';
  end if;

  update public.orders
    set payment_execution_key = claim_key
    where id = o.id;

  update public.scheduled_mailings
    set status = 'processing', blocked_reason = null, updated_at = now()
    where id = s.id;

  return true;
end;
$claim$;

revoke all on function public.claim_scheduled_mailing_payment(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_scheduled_mailing_payment(uuid, uuid)
  to service_role;

commit;
