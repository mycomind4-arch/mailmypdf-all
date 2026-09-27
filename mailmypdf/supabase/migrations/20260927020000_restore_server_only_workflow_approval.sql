-- Forward-only security correction. The runtime bridge replaced the original
-- eight-argument RPC with a nine-argument overload, accidentally regranting
-- authenticated EXECUTE after the secure-quote migration had revoked it.
-- A client must request approval through the server's exact-document and price
-- checks, not manufacture an approval row by calling the Data API directly.
-- Do not roll this back by restoring the unsafe client grant.

revoke all on function public.approve_case_packet(
  uuid, text, jsonb, integer, integer, jsonb, text, jsonb, uuid
) from public, anon, authenticated;

grant execute on function public.approve_case_packet(
  uuid, text, jsonb, integer, integer, jsonb, text, jsonb, uuid
) to service_role;
