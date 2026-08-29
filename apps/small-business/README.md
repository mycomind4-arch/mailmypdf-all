# MailMyPDF Business

A small-business correspondence automation product built on the MailMyPDF mailing/proof architecture.

## Product thesis

**Create → Schedule → Approve → Send → Track → Prove → Archive**

MailMyPDF Business is designed for companies that repeatedly send important physical documents: payment reminders, notices, renewals, contract correspondence, compliance letters, customer communications, and other business mail.

## Current implementation

- MailMyPDF-family warm paper / navy / postal-red visual system
- Business workspace and navigation
- Upcoming correspondence queue
- One-time scheduled mailing composer
- Recurring-monthly scheduling preview
- Calendar view
- Searchable correspondence list
- Approval queue UX
- Automation sequence UX
- Contacts, templates, and proof-archive foundations
- Vendor-neutral domain contracts for Business, Contact, Document, Template, Schedule, MailJob, TrackingInfo, ProofOfMailing, and workflow actions
- Scheduling primitives with one-time and simple recurring RRULE support
- Local prototype persistence for scheduled mailings
- **Real Trigger.dev v4 task definition** for durable mailing execution with schema validation, retries, and idempotent MailMyPDF API calls
- Trigger.dev configuration and deployment scripts
- Twenty CRM API integration boundary
- n8n webhook/event integration boundary
- EspoCRM API integration boundary
- Temporal workflow-provider boundary for future high-complexity workflows

## Source synthesis

The domain layer was synthesized directly from the canonical MailMyPDF source architecture in `mycomind4-arch/mailmypdf`, particularly its vendor-neutral mailing/proof contracts and warm postal design system. The SMB layer adds business contacts, templates, schedules, triggers, conditions, approvals, and automation around those primitives.

The workflow layer now uses the actual `@trigger.dev/sdk` v4 package rather than a simulated scheduler. The durable task lives in `trigger/tasks/execute-mail-job.ts` and calls the MailMyPDF application API with an idempotency key. Trigger.dev owns execution/retries; MailMyPDF owns mailing, tracking, and proof.

Twenty, n8n, EspoCRM, and Temporal are kept behind replaceable integration boundaries. We intentionally do not embed their full application source into the product.

## Production architecture

```text
                         MailMyPDF Business
                                |
             +------------------+------------------+
             |                  |                  |
          CRM/data          Scheduling         Integrations
             |                  |                  |
        Twenty API         Trigger.dev           n8n
        EspoCRM API        (default)             |
             |                  |             Webhooks
             +------------------+------------------+
                                |
                         Business Domain
                                |
              Business → Contact → Document
                                |
                         Schedule / Rule
                                |
                           Approval Gate
                                |
                              MailJob
                                |
                         MailMyPDF API
                                |
                  Document → Send → Tracking
                                |
                         Proof of Mailing
                                |
                       Permanent Archive

              Temporal remains an optional future
              workflow provider behind the same boundary.
```

## Development

```bash
npm install
npm run dev
npm run build
```

For Trigger.dev:

```bash
npm run trigger:dev
npm run trigger:deploy
```

Set the variables in `.env.example` before deploying workers.

## Production phase still required

The frontend is still a Vite application and the local schedule store is intentionally lightweight. Production wiring still needs:

1. persistent Business/Contact/Document/Schedule/MailJob storage;
2. authenticated server endpoint for creating/cancelling schedules;
3. Trigger.dev schedule creation/update/cancellation through the server boundary;
4. real MailMyPDF backend authentication and API endpoints;
5. carrier tracking webhooks;
6. permanent proof generation/storage;
7. approval and team permissions;
8. integration event delivery to n8n.

## Licensing

See `docs/architecture/OPEN_SOURCE_SYNTHESIS.md` for the third-party source/integration map and current upstream license notes. Verify exact versions and license obligations before distributing third-party source or deploying a self-hosted copy.
