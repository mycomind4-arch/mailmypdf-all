-- Run only against an isolated test database with the migration installed.
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
select public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '10000000-0000-4000-8000-000000000001',0,'sender','Business',
 '{"line1":"1 Main St"}', '{"status":"verified"}',true,false);
select public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '10000000-0000-4000-8000-000000000001',0,'sender','Business',
 '{"line1":"1 Main St"}', '{"status":"verified"}',true,false);
do $$ begin
  assert (select revision = 1 from public.saved_mailing_addresses where id = '10000000-0000-4000-8000-000000000001'), 'create retry advanced revision';
  begin
    perform public.write_saved_mailing_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '10000000-0000-4000-8000-000000000001',1,'sender','Stolen','{}','{"status":"verified"}',false,false);
    raise exception 'Cross-owner write allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000001',0,'sender','Wrong revision','{}','{"status":"verified"}',false,false);
    raise exception 'Stale update allowed';
  exception when serialization_failure then null; end;
  begin
    perform public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000002',0,'recipient','Cannot default','{}','{"status":"verified"}',true,false);
    raise exception 'Default recipient allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '10000000-0000-4000-8000-000000000002',0,'sender','Unverified','{}','{}',false,false);
    raise exception 'Unverified save allowed';
  exception when invalid_parameter_value then null; end;
end $$;
select public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '10000000-0000-4000-8000-000000000002',0,'sender','Personal',
 '{"line1":"2 Main St"}', '{"status":"verified"}',true,false);
do $$ begin
  assert (select count(*) = 1 from public.saved_mailing_addresses where is_default), 'multiple defaults';
  assert (select revision = 2 and not is_default from public.saved_mailing_addresses where id = '10000000-0000-4000-8000-000000000001'), 'old default not versioned';
end $$;
select public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '10000000-0000-4000-8000-000000000002',1,'sender','','{}','{}',false,true);
select public.write_saved_mailing_address('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '10000000-0000-4000-8000-000000000002',1,'sender','','{}','{}',false,true);
do $$ begin
  assert (select archived_at is not null and not is_default and revision = 2 from public.saved_mailing_addresses where id = '10000000-0000-4000-8000-000000000002'), 'archive retry mismatch';
end $$;
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true);
do $$ begin
  assert (select count(*) = 0 from public.saved_mailing_addresses), 'cross-owner read';
  begin
    perform public.write_saved_mailing_address('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '10000000-0000-4000-8000-000000000003',0,'sender','Forged','{}','{"status":"verified"}',false,false);
    raise exception 'Client forged verification';
  exception when insufficient_privilege then null; end;
  begin
    update public.saved_mailing_addresses set label = 'Forged';
    raise exception 'Client direct update allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
do $$ begin
  assert (select count(*) = 2 from public.saved_mailing_addresses), 'owner read failed';
end $$;
rollback;
