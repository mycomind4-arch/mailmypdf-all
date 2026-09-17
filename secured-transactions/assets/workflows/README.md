# Workflow Card Assets

## Purpose

Stores reusable public thumbnails/hero assets keyed to secured-transaction workflow IDs.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `<workflow-id>.webp` | Primary workflow thumbnail/hero image. |
| `<workflow-id>-mobile.webp` | Optional alternate crop for narrow layouts. |
| `workflow-assets.ts` | Typed map from workflow IDs to image assets and accessibility metadata. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
