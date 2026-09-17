# Vertical Domain Catalog

## Purpose

Defines section vocabulary and cross-workflow catalog data without duplicating reusable engines.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `workflow-catalog.ts` | Typed metadata for the 17 workflow family members and dependencies. |
| `terminology.ts` | Canonical user-facing and internal terms. |
| `statuses.ts` | Section-specific status labels mapped to shared workflow states. |
| `validity-gates.ts` | References the non-negotiable gates each workflow must satisfy before consequential actions. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
