# Secured-Transaction Eligibility Authenticated Start

## Purpose

Authenticated entry surface and runtime binding for Secured-Transaction Eligibility; it should use the shared workspace shell rather than public marketing UI.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `index.tsx` | Authenticated entry/step page. |
| `runtime-client.ts` | Client-safe adapter to the shared workflow runtime. |
| `workflow.ts` | Binds this workflow manifest, schema, runtime policy, and shared services into an executable workflow. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
