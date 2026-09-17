# Shared Vertical Components

## Purpose

Contains composed UI used by several secured-transaction workflows while relying on the platform design system for primitives.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `TransactionSummary.tsx` | Displays verified parties, obligation, collateral, jurisdiction, and current status. |
| `ValidityGateSummary.tsx` | Shows required transaction elements and which are verified, missing, or disputed. |
| `PerfectionStatus.tsx` | Displays selected perfection methods and execution/verification status. |
| `PriorityMatrix.tsx` | Presents competing interests and rule-based priority analysis without collapsing uncertainty. |
| `HumanReviewBanner.tsx` | Surfaces consequential unresolved findings requiring explicit review. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
