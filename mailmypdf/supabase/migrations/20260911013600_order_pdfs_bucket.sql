-- Provision the private order PDF bucket used by trusted server-side fulfillment.
-- Browser roles receive no storage.objects policy for this bucket; access is through
-- the server-side Supabase secret/service-role client only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-pdfs',
  'order-pdfs',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
