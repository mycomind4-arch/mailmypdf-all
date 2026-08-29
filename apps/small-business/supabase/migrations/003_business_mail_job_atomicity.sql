-- Gold-standard integrity hardening for executable Business mailings.
-- Keep the relational graph intact and make retries safe at the database boundary.

alter table mail_jobs
  alter column lookup_token set default encode(gen_random_bytes(12), 'hex');

create unique index if not exists mail_jobs_intent_idempotency_idx
  on mail_jobs(idempotency_key);

create index if not exists contacts_business_name_idx
  on contacts(business_id, lower(name));

create index if not exists documents_business_created_idx
  on documents(business_id, created_at desc);

create index if not exists mail_jobs_recipient_idx on mail_jobs(recipient_id);
create index if not exists mail_jobs_document_idx on mail_jobs(document_id);

comment on column mail_jobs.idempotency_key is
  'Stable execution key. Business preparation uses mailing-intent:<mailing_intent_id>.';
