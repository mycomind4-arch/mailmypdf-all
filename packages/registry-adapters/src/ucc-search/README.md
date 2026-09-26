# UCC Search Adapters

## Purpose

Queries supported UCC filing sources and normalizes filing/search records for pre-filing and priority analysis.

## Files

| File | Function |
| --- | --- |
| `adapter.ts` | Provider-neutral UccSearchAdapter interface. |
| `normalizer.ts` | Normalizes debtor names, secured-party names, filing numbers, dates, status, collateral text, and source provenance. |
| `search-strategy.ts` | Supports controlled search variants without declaring them authoritative filing names. |
| `registry.ts` | Adapter registry by jurisdiction/provider. |
| `types.ts` | UCC query/result types. |
| `index.ts` | Module exports. |

`providers/` (concrete filing-office/search-provider adapters) remains
unbuilt — no real search provider is wired yet.

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

This is a **read-only search** framework (`RegistryAdapter.search()`) for
pre-filing due diligence — it deliberately does not grow a filing-submission
capability of its own. Actually *filing* a UCC-1 is `@mailmypdf/efiling`'s
job (`jurisdiction.kind: "agency"`); a workflow doing a real UCC filing
should depend on both.

## Notes

Search completeness and provider limitations must be represented explicitly. A no-hit result is not automatically proof that no competing interest exists.
