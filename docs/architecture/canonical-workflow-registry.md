# Canonical workflow registry

`packages/workflows/src/canonical-workflows.json` owns workflow identity, labels,
authority-review references, retained legacy-content references and execution
bindings. `canonical-workflow-registry.ts` validates it and derives paths and
maturity. The dependency direction is shared registry → host projections; the
shared package must never import host navigation or SEO code.

The registry covers 441 existing root workflows: the previous 438 navigation
identities plus the already-mounted Equifax, Experian and TransUnion local
intakes. These are recovered identities, not newly implemented workflows.

## Compatibility surfaces

| Consumer | Projection |
| --- | --- |
| Host registry helpers | Re-export the shared `canonical-registry` entry point |
| Navigation | Group canonical workflows using the section registry |
| `WORKFLOW_INVENTORY.json` | Deterministic generated snapshot; `pnpm registry:generate` |
| SEO catalog | Canonical identity and review metadata joined to authored content |
| Execution registry | Existing record shape, paths and start-UI status |
| Platform policy resolver | Dispatch only explicit canonical platform bindings |
| Host case resolver | Preserve legacy definitions; require a platform binding for newer runtimes |

The 130-record historical inventory is preserved unchanged in
`docs/migrations/legacy-workflow-inventory.json`. Unresolved legacy concepts stay
there for migration review. They cannot create public routes or confer maturity.
Reviewed legacy URL aliases continue to resolve to their canonical pages.

## Maturity and execution are explicit

- `catalog`: registered identity without an authority review or connected execution.
- `source-verified`: an individually authored authority module and its review date.
- `domain-ready`: a connected local analytical intake, without platform execution.
- `executable`: a connected platform runtime with a registered policy family.

These labels do not certify production fulfillment. No live mailing, payment or
model call is implied by a build or test result. "Gold" editorial copy is retained
as content, never used to promote maturity. The generated inventory deliberately
does not claim passing tests from historical flags; CI reports actual test results.

The existing execution-registry API uses `executable` to mean a connected start
UI. That compatibility meaning is preserved for local intakes; callers deciding
whether to execute on the server must use the canonical platform binding/policy.
There are 24 platform runtimes and six local intakes, with all 26 previously
registered execution URLs preserved. CP14's existing public start route is now
represented alongside the others.

SEO publication is separate: authority content still must pass the Authority
Gate. An executable authority-page CTA additionally requires the canonical
execution binding's explicit `verified` flag. Adding prose or a legacy inventory
claim cannot grant execution permission. Local intakes have no platform policy.

CP523 and the original `ssdi-denial` host definition remain explicit legacy
runtimes. They retain their existing behavior and IDs; neither is silently
relabelled or substituted with a different canonical workflow.

## Changing the registry

1. Add or edit the canonical record for an existing root workflow.
2. For execution, bind its real start entry and implementation (manifest or
   step-workflow), and select a platform policy family only if implemented.
3. For authority review, register the authored module and matching review date.
4. Run `pnpm registry:generate`, then `pnpm registry:check` and
   `node scripts/verify-product-topology.mjs`.
5. Run the shared workflow tests and host projection/runtime tests. CI also
   requires the authority gate, public landing gate, core build and section builds.

The topology guard checks both directions: every registered workflow has a real
root config, and every root workflow config is registered. It rejects missing
start implementations, orphaned workspace components and incorrect authority
module identities. Runtime tests compare every policy provider with its canonical
bindings in both directions and exercise the real host resolver. Mutation tests
prove that duplicates, omissions and missing execution bindings are rejected.
