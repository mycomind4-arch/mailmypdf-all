# MailMyPDF Business — Open Source Synthesis

MailMyPDF Business uses several established open-source projects as implementation references and optional infrastructure boundaries. The product is **not** a blind fork of any of them.

## Runtime roles

### Trigger.dev — primary workflow runtime
Repository: https://github.com/triggerdotdev/trigger.dev

Used for durable scheduled/conditional task execution. The repository's v4 SDK exposes `task`, `schemaTask`, retries, queues, waits, idempotency, and schedules; this project uses `@trigger.dev/sdk` and keeps application mailing logic behind the MailMyPDF API.

### Twenty — CRM model and optional integration
Repository: https://github.com/twentyhq/twenty

MailMyPDF Business uses Twenty's business/contact/object/workflow ideas and provides an integration boundary in `src/integrations/twenty.ts`. We do not copy Twenty's AGPL application code into this repository.

Twenty's current license includes an Application Exception for applications that interact through its published APIs without incorporating/modifying Twenty source. Review the upstream license before enabling any deeper source-level integration.

### n8n — integration/automation layer
Repository: https://github.com/n8n-io/n8n

n8n is treated as an external automation platform. `src/integrations/n8n.ts` emits MailMyPDF Business events to n8n webhooks. We do not embed n8n source into the product.

### Temporal — future durable workflow provider
Repository: https://github.com/temporalio/temporal

`src/integrations/temporal.ts` defines a provider boundary so complex workflows can move to Temporal if/when scale or workflow complexity justifies it. Temporal is not required by the initial runtime.

### EspoCRM — optional CRM integration/reference
Repository: https://github.com/espocrm/espocrm

`src/integrations/espocrm.ts` provides an external API boundary. We do not copy EspoCRM's AGPL application source into MailMyPDF Business.

## Licensing notes

- Trigger.dev repository: Apache-2.0 (verify the exact package/version used before distribution).
- Twenty repository: predominantly AGPLv3 with a documented Application Exception and MIT-licensed packages; exact files/packages matter.
- n8n repository: Sustainable Use License for applicable source, with additional restrictions and separate Enterprise-licensed `.ee` material.
- Temporal repository: MIT.
- EspoCRM repository: AGPLv3.

These notes are architectural guidance, not legal advice. Before shipping a production distribution that incorporates third-party source code rather than consuming it as a dependency/service, perform a formal license review and preserve required notices.

## Design principle

MailMyPDF owns the durable business domain:

`Business → Contact → Document → Correspondence → Schedule → Approval → MailJob → Tracking → Proof`

Third-party systems provide replaceable capabilities around that domain rather than becoming the product's source of truth.
