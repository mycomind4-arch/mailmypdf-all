# UCC-1 Preparation & Authorization — Workflow Plan

## Purpose

Prepare an authorized financing statement using the controlling debtor name, secured-party information, collateral indication, jurisdiction rules, and filing-office requirements.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.tsx` | Public workflow landing page built from the shared workflow/section UI. |
| `config.ts` | Workflow-specific display, routing, pricing references, assets, and feature configuration. |
| `manifest.ts` | Declarative workflow graph: steps, inputs, outputs, gates, dependencies, review points, and completion criteria. |
| `schema.ts` | Typed intake, state, finding, and output schemas unique to this workflow. |
| `intelligence.ts` | Bindings from extracted facts/evidence to shared identity, secured-transaction, and jurisdiction engines. |
| `runtime-policy.ts` | Consequential-action gates, review requirements, failure states, and allowed transitions. |
| `seo.ts` | Workflow-specific metadata, search intent, structured data, and canonical route. |
| `standard.md` | Definition of done and domain-specific acceptance criteria. |
| `assets/` | Workflow-specific public visual assets. |
| `forms/` | Official forms, generated forms, templates, and mappings used by this workflow. |
| `prompts/` | AI prompts used only where deterministic rules are insufficient. |
| `rules/` | Workflow-specific deterministic rules and gates. |
| `authority/` | Primary authority, source mappings, jurisdiction coverage, and provenance references. |
| `fixtures/` | Synthetic scenarios used by tests and Studio workflow simulation. |
| `tests/` | Workflow-local unit and acceptance tests. |
| `start/` | Authenticated workflow entry and runtime binding. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Primary planned outputs: UCC-1 data model, draft filing, authorization finding, debtor-name validation, and filing checklist. This workflow must expose uncertainty and provenance rather than allowing AI to silently select a legally consequential answer.
