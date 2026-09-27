-- Additive, no backfill. Rollback: disable tools; retain this table to preserve
-- user data. Any eventual removal requires a separate forward migration/export.
create table public.saved_mailing_addresses (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sender', 'recipient')),
  label text not null check (length(btrim(label)) between 1 and 80),
  address jsonb not null check (jsonb_typeof(address) = 'object'),
  country text not null default 'US' check (country = 'US'),
  verification jsonb not null,
  revision integer not null default 1 check (revision > 0),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_default or (kind = 'sender' and archived_at is null))
);
create index saved_mailing_addresses_owner on public.saved_mailing_addresses(owner_id, kind);
create unique index saved_mailing_addresses_default on public.saved_mailing_addresses(owner_id)
  where is_default and archived_at is null;
alter table public.saved_mailing_addresses enable row level security;
revoke all on public.saved_mailing_addresses from public, anon, authenticated;
grant select on public.saved_mailing_addresses to authenticated;
grant all on public.saved_mailing_addresses to service_role;
create policy saved_mailing_addresses_read_owned on public.saved_mailing_addresses
  for select to authenticated using (owner_id = auth.uid());

-- Server-only writes. Serialize all changes for an owner, including defaults.
-- Revision checks prevent lost updates. Repeated identical requests are safe.
create function public.write_saved_mailing_address(
  p_owner uuid, p_id uuid, p_revision integer, p_kind text, p_label text,
  p_address jsonb, p_verification jsonb, p_default boolean, p_archive boolean
) returns public.saved_mailing_addresses
language plpgsql security definer set search_path = public, pg_temp as $$
declare old public.saved_mailing_addresses; result public.saved_mailing_addresses;
begin
  if p_owner is null or p_id is null or p_revision is null or p_revision < 0
     or p_default is null or p_archive is null then
    raise exception 'Invalid address request' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 17924));
  select * into old from public.saved_mailing_addresses where id = p_id for update;
  if found and old.owner_id <> p_owner then
    raise exception 'Address not available' using errcode = '42501';
  end if;
  if p_archive then
    if old.id is null then raise exception 'Address not available' using errcode = '42501'; end if;
    if old.archived_at is not null and old.revision = p_revision + 1 then return old; end if;
    if old.revision <> p_revision or old.archived_at is not null then
      raise exception 'Address changed; reload' using errcode = '40001';
    end if;
    update public.saved_mailing_addresses set archived_at = now(), is_default = false,
      revision = revision + 1, updated_at = now() where id = p_id returning * into result;
    return result;
  end if;
  if p_kind not in ('sender', 'recipient') or p_kind is null or p_label is null
     or length(btrim(p_label)) not between 1 and 80
     or p_address is null or jsonb_typeof(p_address) <> 'object'
     or p_verification is null or p_verification->>'status' is distinct from 'verified'
     or (p_default and p_kind <> 'sender') then
    raise exception 'Invalid address request' using errcode = '22023';
  end if;
  if old.id is not null then
    if old.archived_at is not null or old.kind <> p_kind then
      raise exception 'Address unavailable or wrong kind' using errcode = '40001';
    end if;
    if old.revision = p_revision + 1 and old.label = btrim(p_label)
       and old.address = p_address and old.is_default = p_default then return old; end if;
    if old.revision <> p_revision then raise exception 'Address changed; reload' using errcode = '40001'; end if;
  elsif p_revision <> 0 then
    raise exception 'Address not available' using errcode = '40001';
  end if;
  if p_default then
    update public.saved_mailing_addresses set is_default = false, revision = revision + 1,
      updated_at = now() where owner_id = p_owner and is_default and id <> p_id;
  end if;
  insert into public.saved_mailing_addresses(id, owner_id, kind, label, address, verification, is_default)
    values(p_id, p_owner, p_kind, btrim(p_label), p_address, p_verification, p_default)
  on conflict (id) do update set label = excluded.label, address = excluded.address,
    verification = excluded.verification, is_default = excluded.is_default,
    revision = saved_mailing_addresses.revision + 1, updated_at = now()
  where saved_mailing_addresses.owner_id = p_owner
    and saved_mailing_addresses.revision = p_revision
    and saved_mailing_addresses.kind = p_kind and saved_mailing_addresses.archived_at is null
  returning * into result;
  if not found then raise exception 'Address changed; reload' using errcode = '40001'; end if;
  return result;
end;
$$;
revoke all on function public.write_saved_mailing_address(uuid,uuid,integer,text,text,jsonb,jsonb,boolean,boolean) from public, anon, authenticated;
grant execute on function public.write_saved_mailing_address(uuid,uuid,integer,text,text,jsonb,jsonb,boolean,boolean) to service_role;
