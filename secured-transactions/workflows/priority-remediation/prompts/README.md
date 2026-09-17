# Priority Remediation Prompts

## Purpose

Contains narrowly scoped AI prompts for Priority Remediation; deterministic legal/filing rules must remain in rules or shared engines.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `extraction.md` | Extract workflow-specific candidate facts from documents without deciding legal conclusions. |
| `analysis.md` | Analyze ambiguous evidence after deterministic facts/rules have been assembled. |
| `drafting.md` | Draft human-facing text strictly from approved findings and evidence. |
| `review.md` | Critique a draft or finding for unsupported assertions, contradictions, and missing evidence. |
| `prompt-manifest.ts` | Versioned prompt IDs, input/output contracts, model policy, and allowed uses. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
