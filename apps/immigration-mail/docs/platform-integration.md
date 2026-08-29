# Immigration Mail × MailMyPDF Platform

Immigration Mail is the immigration-specific vertical. MailMyPDF remains the canonical ecosystem service for identity, account state, billing, mailing fulfillment, tracking, proof, and shared platform services. Immigration-specific workflows, prompts, UX, content, and government-source policy remain owned here.

## Capability ownership

| Capability | Owner | Vertical use |
| --- | --- | --- |
| Identity / account | MailMyPDF | Required for production users |
| Billing / platform usage | MailMyPDF | Platform usage and mailing charges |
| Mailing order / fulfillment | MailMyPDF | Send prepared correspondence |
| Tracking / proof | MailMyPDF | Persistent mailing record and evidence |
| Document processing | Platform | Upload, extraction, normalization |
| Provenance / evidence | Platform | Source-backed facts and claims |
| AI orchestration / governed agents | Platform | Drafting, checking, workflow assistance |
| Search / authoritative-source research | Platform | Government-source retrieval |
| Voice interaction | Platform | Optional voice-controlled workflows |
| Immigration workflows | Immigration Mail | Notice response, explanation letters, supporting documents, etc. |
| Immigration content / prompts | Immigration Mail | Immigration-specific behavior |
| Immigration UX / SEO | Immigration Mail | Vertical experience |

## Production boundary

The vertical must consume shared capabilities through stable adapters. It must not create replacement authentication, billing, mailing, tracking, or proof systems.

The existing `src/platform/mailmypdf-provider.ts` is the mailing boundary. It maps the vertical's `MailingProvider` contract into the MailMyPDF communication contract and preserves idempotency, recipient data, mail type, matter metadata, and legal-reference metadata.

## First production integration sequence

1. Connect MailMyPDF identity/account context.
2. Replace development/stub platform calls with authenticated MailMyPDF service calls.
3. Connect Platform document intake and extraction.
4. Connect provenance/evidence storage for government-source facts.
5. Connect governed AI workflow execution.
6. Add authoritative USCIS/government research workflows.
7. Add draft validation and contradiction checks before mailing.
8. Connect mailing payment/order authorization to MailMyPDF.
9. Persist tracking and proof through MailMyPDF.
10. Add optional voice control without changing the underlying workflow contracts.

## Safety requirements

The vertical must never invent immigration facts, deadlines, filing requirements, eligibility conclusions, or government policy. Requirements presented to users must be traceable to authoritative sources. AI-generated drafts require review before consequential mailing actions.
