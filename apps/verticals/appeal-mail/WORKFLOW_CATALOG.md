# WORKFLOW_CATALOG.md — Appeal Mail

**Last updated:** 2026-08-22

## Overview
20 appeal workflows across 7 categories. Gold-standard executable implementations are maintained by workflow branch/PR.

## Categories

| Category | Slug | Workflows |
|---|---|---|
| Insurance | insurance | 9 |
| Disability & Social Security | disability | 5 |
| Unemployment | unemployment | 2 |
| Government Benefits | benefits | 4 |
| Workers' Compensation | workers-comp | 2 |
| Veterans | veterans | 1 |
| Administrative | administrative | 3 |

## Gold workflow status

| Workflow | Status | Executable |
|---|---|---|
| Agency Decision Appeal | Gold implementation | ✅ |
| Administrative Decision Appeal | Gold implementation | ✅ |
| Licensing Appeal | Cataloged | ❌ |

## Administrative Decision Appeal
- Route: `/workflows/administrative-decision-appeal`
- Engine: authority-first administrative decision analysis
- AI provider: Gemini via MailMyPDF control plane
- Includes: analysis, drafting, independent validation, human approval, pricing, Stripe checkout, deterministic PDF fulfillment, mailing/proof
- Pricing: $32.99 preparation; 4 response sheets included; additional response sheets $0.45/sheet; supporting-document sheets $0.25/sheet; mailing method and packet surcharge calculated separately.

## Catalog Entry Schema

Each entry has: slug, title, category, shortDescription, longDescription, intendedUser, problemSolved, whatWeAnalyze[], whatYouNeed[], whatWeIdentify[], whatAppealAddresses[], seoTitle, seoDescription, primaryKeyword, relatedKeywords[], route, status, engine, executable, cta
