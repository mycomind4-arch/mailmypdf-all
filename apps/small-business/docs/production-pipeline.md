# Production scheduled-mail pipeline

## Runtime

The product separates durable execution from the mailing provider:

`Schedule -> Schedule Run -> Trigger.dev -> approval -> MailJob -> MailMyPDF API -> carrier -> webhook -> tracking -> proof`

### Persistence

`supabase/migrations/001_business_correspondence.sql` is the first production Postgres schema. It persists businesses, contacts, documents, templates, schedules, mail jobs, schedule runs, approvals, tracking events and audit events.

### Idempotency

Every schedule run receives a unique idempotency key. The key must survive retries and must be passed through to the MailMyPDF execution API. A retry must never create a second physical mailing.

### Workflow planning

`src/services/workflow.ts` contains the pure conditional planner. It evaluates trigger/action conditions without performing I/O. This lets the UI preview the exact result of an automation and lets Trigger.dev execute the same rules.

### Mailing boundary

`src/services/mailmypdf-api.ts` is the typed application boundary. The SMB product never calls Lob directly. MailMyPDF remains responsible for document rendering, pricing, payment, carrier submission, tracking normalization and proof generation.

### Approval

An approval-required workflow must create an `approvals` row and pause the schedule run. Only an explicit approval may transition the run to execution. Rejection cancels the run and records an audit event.

### Future adapters

Trigger.dev is the first durable execution provider. The workflow planner has no Trigger.dev dependency, so a Temporal adapter can be introduced later without changing the domain model.

Twenty and EspoCRM remain integration boundaries rather than embedded CRM dependencies. n8n is an event/integration boundary.
