# Business Registry Adapters

## Purpose

Resolves registered-organization records through provider/jurisdiction adapters while preserving the source response and provenance.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `adapter.ts` | Provider-neutral BusinessRegistryAdapter interface. |
| `normalizer.ts` | Normalizes provider records into authoritative-name/entity facts. |
| `registry.ts` | Adapter registry by jurisdiction/provider. |
| `providers/` | Concrete API/browser/data-source adapters as they are implemented. |
| `types.ts` | Business-registry query/result types. |
| `index.ts` | Module exports. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Adapters should not silently convert a search hit into a legal identity conclusion; they provide evidence to the identity-capacity engines.
