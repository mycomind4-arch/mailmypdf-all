# Section Configuration

## Purpose

Keeps section-level configuration declarative and separate from workflow-specific manifests.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `section-config.ts` | Section label, routes, feature configuration, and shared defaults. |
| `workflow-registry.ts` | Canonical list of workflow IDs, imports, ordering, and status. |
| `feature-flags.ts` | Feature gates for incomplete adapters or jurisdiction coverage. |
| `pricing-defaults.ts` | Optional vertical defaults that defer final pricing behavior to the shared pricing package. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
