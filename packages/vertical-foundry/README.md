# Vertical Foundry

The Vertical Foundry is the governed product-production layer for the MailMyPDF ecosystem.

## Pipeline

RESEARCH → SELECT → SPECIFY → BUILD → QA → RED_TEAM → VERIFY → DEPLOY → REGISTER

## Agent council

Market research, competition analysis, product strategy, UX architecture, vertical architecture, implementation, security QA, UX QA, domain QA, evidence QA, red teaming, and release judgment are intentionally separated.

## Model routing

Agents request a model class rather than hard-coding a model. Cloudflare AI Gateway is the preferred routing boundary; approved external providers may be used as explicit fallbacks.

## Quality gate

A release requires an independent QA council score of at least 80, no blockers, and a release-judge pass. Failed gates return remediation work to the builder rather than allowing deployment.

## Autonomy boundary

Research, planning, coding, testing, and preview preparation may be autonomous. Production deployment, ecosystem registration, mailing, billing, account changes, permissions, and other consequential actions require explicit human approval.

## Goal

Optimize for validated product quality, not the number of verticals generated. The Foundry may research many opportunities and reject most of them before implementation.
