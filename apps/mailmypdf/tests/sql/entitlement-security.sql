-- Run against an isolated migrated database; all synthetic rows are rolled back.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.invalid');

insert into public.pricing_quotes
  (id, user_id, workflow_id, vertical_id, workflow_base_cents, total_cents)
values
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'synthetic', 'synthetic', 100, 100),
  ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', 'synthetic', 'synthetic', 100, 100);

insert into public.organizations (id, name, created_by) values
  ('55555555-5555-4555-8555-555555555555', 'Synthetic organization', '11111111-1111-4111-8111-111111111111');
insert into public.organization_members (organization_id, user_id) values
  ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111'),
  ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  if (select count(*) from public.pricing_quotes) <> 1 then
    raise exception 'Quote owner isolation failed';
  end if;
  if (select count(*) from public.organization_members) <> 1 then
    raise exception 'Membership lookup must expose only the caller without recursive RLS';
  end if;
  begin
    insert into public.pricing_quotes (user_id, workflow_id, vertical_id, workflow_base_cents, total_cents, status)
      values (auth.uid(), 'forged', 'forged', 0, 0, 'accepted');
    raise exception 'Caller manufactured an accepted zero-price quote';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.pricing_quotes set status = 'accepted' where user_id = auth.uid();
    raise exception 'Caller accepted an unpaid quote';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.pricing_quotes where user_id = auth.uid();
    raise exception 'Caller deleted quote history';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.entitlements_audit_log (actor_user_id, action, resource_type)
      values (auth.uid(), 'quote_accepted', 'quote');
    raise exception 'Caller forged an audit event';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
do $$ begin
  begin
    perform * from public.pricing_quotes;
    raise exception 'Anonymous caller read quotes';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
\echo 'PASS: quote ownership, membership RLS, forged insert/update/delete, audit forgery, anonymous access'
