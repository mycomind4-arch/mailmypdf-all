-- Bridge secure workflow packet approvals into the existing MailMyPDF order,
-- Stripe, and Lob fulfillment pipeline.
--
-- Invariants:
--   * One immutable case approval creates at most one physical-mail order.
--   * The order records the exact approved packet hash and approved price.
--   * Approval linkage cannot be retargeted after order creation.

begin;

alter table public.orders
  add column if not exists workflow_case_id uuid references public.workflow_cases(id),
  add column if not exists case_approval_id uuid references public.case_approvals(id),
  add column if not exists approved_packet_sha256 text,
  add column if not exists approved_price_cents integer;

alter table public.orders
  drop constraint if exists orders_approved_packet_sha256_check;
alter table public.orders
  add constraint orders_approved_packet_sha256_check
  check (
    approved_packet_sha256 is null
    or approved_packet_sha256 ~ '^[0-9a-f]{64}$'
  );

alter table public.orders
  drop constraint if exists orders_approved_price_cents_check;
alter table public.orders
  add constraint orders_approved_price_cents_check
  check (approved_price_cents is null or approved_price_cents >= 0);

create unique index if not exists orders_case_approval_uidx
  on public.orders(case_approval_id)
  where case_approval_id is not null;

create index if not exists orders_workflow_case_idx
  on public.orders(workflow_case_id)
  where workflow_case_id is not null;

create or replace function public.prevent_workflow_order_retarget()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.case_approval_id is not null and new.case_approval_id is distinct from old.case_approval_id then
    raise exception 'case approval linkage is immutable';
  end if;
  if old.workflow_case_id is not null and new.workflow_case_id is distinct from old.workflow_case_id then
    raise exception 'workflow case linkage is immutable';
  end if;
  if old.approved_packet_sha256 is not null and new.approved_packet_sha256 is distinct from old.approved_packet_sha256 then
    raise exception 'approved packet hash is immutable';
  end if;
  if old.approved_price_cents is not null and new.approved_price_cents is distinct from old.approved_price_cents then
    raise exception 'approved workflow price is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists workflow_order_approval_immutable on public.orders;
create trigger workflow_order_approval_immutable
  before update on public.orders
  for each row execute function public.prevent_workflow_order_retarget();

commit;
