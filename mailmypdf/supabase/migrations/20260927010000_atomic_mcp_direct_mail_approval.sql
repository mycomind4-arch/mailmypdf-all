-- Record the exact reviewed mailing and its approval event in one transaction.
begin;

-- Only one owner-visible order can win a repeated preparation intent, even
-- when two requests arrive before either has written its ownership event.
create unique index if not exists order_events_mcp_direct_mail_intent_uidx
  on public.order_events ((metadata->>'owner_id'), (metadata->>'idempotency_key'))
  where type = 'mcp.direct_mail.prepared';

create or replace function public.approve_mcp_direct_mail(
  p_order_id uuid, p_owner_id uuid, p_packet_sha256 text,
  p_total_cents integer, p_mailing_snapshot jsonb
) returns boolean
language plpgsql security invoker set search_path = public
as $$
declare
  o public.orders%rowtype;
  current_snapshot jsonb;
  prior jsonb;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not exists (
    select 1 from public.order_events where order_id = p_order_id
      and type = 'mcp.direct_mail.prepared'
      and metadata->>'owner_id' = p_owner_id::text
  ) then raise exception 'Order not found'; end if;

  current_snapshot := jsonb_build_object(
    'sender', jsonb_build_object('name', o.sender_name, 'line1', o.sender_line1,
      'line2', o.sender_line2, 'city', o.sender_city, 'state', o.sender_state, 'postal', o.sender_postal),
    'recipient', jsonb_build_object('name', o.recipient_name, 'line1', o.recipient_line1,
      'line2', o.recipient_line2, 'city', o.recipient_city, 'state', o.recipient_state, 'postal', o.recipient_postal),
    'mailClass', coalesce(o.mail_class, 'standard'), 'color', coalesce(o.color, false)
  );
  if p_mailing_snapshot is distinct from current_snapshot
     or p_packet_sha256 is null or p_packet_sha256 !~ '^[0-9a-f]{64}$'
     or p_total_cents is null or p_total_cents < 0 then
    raise exception 'The reviewed mailing changed or approval is invalid';
  end if;

  select metadata into prior from public.order_events
    where order_id = p_order_id and type = 'mcp.direct_mail.approved';
  if prior is not null then
    if prior->>'owner_id' is distinct from p_owner_id::text
       or prior->>'packet_sha256' is distinct from p_packet_sha256
       or prior->'total_cents' is distinct from to_jsonb(p_total_cents)
       or prior->'mailing_snapshot' is distinct from current_snapshot
       or o.approved_packet_sha256 is distinct from p_packet_sha256
       or o.approved_price_cents is distinct from p_total_cents then
      raise exception 'Existing approval differs from the reviewed mailing';
    end if;
    return true;
  end if;

  if o.status <> 'draft' then raise exception 'Only unpaid draft orders can be approved'; end if;
  if (o.approved_packet_sha256 is not null and o.approved_packet_sha256 <> p_packet_sha256)
     or (o.approved_price_cents is not null and o.approved_price_cents <> p_total_cents) then
    raise exception 'Existing approval differs from the reviewed mailing';
  end if;
  update public.orders set approved_packet_sha256 = p_packet_sha256,
    approved_price_cents = p_total_cents where id = p_order_id;
  insert into public.order_events(order_id, type, label, metadata) values (
    p_order_id, 'mcp.direct_mail.approved', 'User approved exact direct-mail PDF, price, and mailing details',
    jsonb_build_object('owner_id', p_owner_id, 'packet_sha256', p_packet_sha256,
      'total_cents', p_total_cents, 'mailing_snapshot', current_snapshot)
  );
  return false;
end;
$$;
revoke all on function public.approve_mcp_direct_mail(uuid, uuid, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.approve_mcp_direct_mail(uuid, uuid, text, integer, jsonb) to service_role;

-- Prevent approved destinations or PDF references changing after the atomic check.
create or replace function public.freeze_mcp_direct_mail_details()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.approved_packet_sha256 is not null and exists (
    select 1 from public.order_events where order_id = old.id and type = 'mcp.direct_mail.prepared'
  ) and (
    row(new.sender_name,new.sender_line1,new.sender_line2,new.sender_city,new.sender_state,new.sender_postal,
        new.recipient_name,new.recipient_line1,new.recipient_line2,new.recipient_city,new.recipient_state,new.recipient_postal,
        new.mail_class,new.color,new.pdf_storage_path,new.page_count,new.email)
    is distinct from
    row(old.sender_name,old.sender_line1,old.sender_line2,old.sender_city,old.sender_state,old.sender_postal,
        old.recipient_name,old.recipient_line1,old.recipient_line2,old.recipient_city,old.recipient_state,old.recipient_postal,
        old.mail_class,old.color,old.pdf_storage_path,old.page_count,old.email)
  ) then raise exception 'Approved direct-mail details are immutable'; end if;
  return new;
end;
$$;
create trigger mcp_direct_mail_details_immutable before update on public.orders
  for each row execute function public.freeze_mcp_direct_mail_details();
commit;
