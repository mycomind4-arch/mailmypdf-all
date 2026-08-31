# Records Requests — MailMyPDF Platform Alignment

## Purpose

Records Requests is a vertical application. Reusable infrastructure belongs in `mailmypdf-platform`; records-specific domain intelligence belongs here.

## Reuse boundaries

| Capability | Source of truth |
|---|---|
| Core identifiers/contracts | `mailmypdf-platform/packages/core` |
| Intelligence primitives | `mailmypdf-platform/packages/intelligence` |
| Workflow lifecycle / Gold Standard contracts | `mailmypdf-platform/packages/workflows` |
| Fulfillment contracts | `mailmypdf-platform/packages/fulfillment` |
| Proof/audit artifacts | `mailmypdf-platform/packages/proof` |
| Vertical capability/approval contracts | `mailmypdf-platform/packages/vertical-foundry` |
| Records request domain | this repository |

## Records-specific ownership

Records Requests owns the domain model and intelligence for agencies, custodians, record categories, request construction, jurisdiction-specific request strategy, production review, withholding/redaction findings, completeness analysis, and records-specific escalation actions.

It must not create competing implementations of generic facts, evidence, provenance, findings, timelines, risk, workflow lifecycle, fulfillment, or proof primitives when the platform already provides those contracts.

## Dependency strategy

Until the platform packages are published/consumable as workspace packages, use explicit compatibility adapters at the Records Requests boundary. Do not copy platform source into this repository. When package distribution is available, replace adapters with direct package imports without changing the Records domain API.

## Workflow target

The first flagship workflow is `code-enforcement-records`. It should be implemented as a domain pack/workflow capability on top of the platform lifecycle rather than as a second workflow engine.
