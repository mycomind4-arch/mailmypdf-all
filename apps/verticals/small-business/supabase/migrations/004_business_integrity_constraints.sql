-- Gold-standard integrity constraints for executable Business correspondence.
-- Server routes use the service role, but database invariants must remain true
-- even if another writer or future integration touches these tables.

create unique index if not exists contacts_id_business_uidx on contacts(id, business_id);
create unique index if not exists documents_id_business_uidx on documents(id, business_id);

alter table mail_jobs
  add constraint mail_jobs_recipient_business_fk
  foreign key (recipient_id, business_id) references contacts(id, business_id);

alter table mail_jobs
  add constraint mail_jobs_document_business_fk
  foreign key (document_id, business_id) references documents(id, business_id);

alter table contacts add constraint contacts_business_name_nonempty check (length(trim(name)) > 0);
alter table documents add constraint documents_size_nonnegative check (size_bytes >= 0);
alter table documents add constraint documents_page_count_nonnegative check (page_count >= 0);
alter table mail_jobs add constraint mail_jobs_lookup_nonempty check (length(trim(lookup_token)) > 0);
alter table mail_jobs add constraint mail_jobs_idempotency_nonempty check (length(trim(idempotency_key)) > 0);

create unique index if not exists mail_jobs_business_lookup_idx on mail_jobs(business_id, lookup_token);
