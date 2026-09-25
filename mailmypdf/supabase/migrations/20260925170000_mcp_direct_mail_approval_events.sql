-- Make MCP direct-mail approval snapshots append-only and one-per-order.
-- The order row already carries immutable approved_packet_sha256 and
-- approved_price_cents. This event binds the remaining consequential mailing
-- fields (sender, recipient, mail class, color) to that same approval.

begin;

create unique index if not exists order_events_mcp_direct_mail_approval_uidx
  on public.order_events(order_id)
  where type = 'mcp.direct_mail.approved';

create or replace function public.prevent_mcp_direct_mail_approval_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.type = 'mcp.direct_mail.approved' then
    raise exception 'direct-mail approval events are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists mcp_direct_mail_approval_event_immutable on public.order_events;
create trigger mcp_direct_mail_approval_event_immutable
  before update or delete on public.order_events
  for each row
  when (old.type = 'mcp.direct_mail.approved')
  execute function public.prevent_mcp_direct_mail_approval_event_mutation();

commit;
