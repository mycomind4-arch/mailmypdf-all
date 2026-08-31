# Appeal Mail Workflow Standard v2

Effective: 2026-08-20
Catalog version: `2026-08-20-appeal-mail-v2`
Current workflows: 32

## Customer experience

Every Appeal Mail workflow uses one simple customer journey:

1. **Understand** — upload the source decision/denial/notice as PDF, PNG, or JPEG.
2. **Build** — Gemini analyzes the actual document, identifies the decision, reasons, dates, evidence gaps, and workflow-specific issues, then Gemini drafts and validates the response.
3. **Send** — the customer reviews the response, supplies/validates the recipient, explicitly approves, pays, and the server controls MailMyPDF fulfillment, tracking, and proof.

The user does not choose an AI model. Provider/model routing belongs to the MailMyPDF control plane.

## Workflow contract

Every workflow definition must declare:

- unique workflow ID
- customer-facing title and description
- primary search keyword when available
- monthly search volume and CPC when researched
- keyword intent
- workflow-specific analysis prompt
- focus areas / required facts
- document acceptance
- the three customer experience stages
- the shared internal readiness and fulfillment pipeline

## AI contract

The LLM is responsible for document analysis, reasoning, response creation, and draft validation. Deterministic code remains responsible for schema validation, provenance, deadlines, contradictions, safety gates, approval, payments, fulfillment state, and auditability.

Current live provider for Appeal Mail is Gemini. Claude/OpenAI can be added later through the MailMyPDF admin control plane without changing the customer workflow.

## Fulfillment contract

No workflow may claim mailing success from a draft or approval alone. The production path is:

`document -> analysis -> draft -> validation -> human review -> approval -> payment -> MailMyPDF -> tracking -> proof`

## Current catalog

Denied Claim; Government Decision; Court Ruling; Reconsideration; Insurance Claim Denial; Insurance Denial Letter; Insurance Coverage Denial; Medical Insurance Denial; Medical Necessity Appeal; Prior Authorization Denial; Out-of-Network Denial; Dental Insurance Appeal; Car Insurance Appeal; Life Insurance Denial; Claim Denial Letter; SSDI Denial; SSI Denial; Social Security Denial; Medicaid Denial; Unemployment Denial; EDD Denial; Financial Aid Appeal; SAP Appeal; Financial Aid Suspension Appeal; Financial Aid Reinstatement; Financial Aid Special Circumstances; Scholarship Appeal; FAFSA Appeal; License Suspension Appeal; Driver's License Suspension; License Revocation Appeal; DMV Suspension Appeal; Registration Suspension Appeal.

## Rule for new workflows

Do not create a new UI architecture for a new Appeal Mail workflow. Add a new problem definition to `src/domain/workflows.ts`, give it its own keyword/problem metadata and AI prompt, and route it through the universal workspace and shared execution controls.
