# Master Capability Registry

Updated 2026-09-27.

## Outcome

`packages/workflows/src/capability-registry.ts` is the single authoritative
capability contract for MailMyPDF. It extends the current Workflow Factory,
`WorkflowManifest`, `CapabilityRuntime`, `PlatformCapabilityBundle`, and
`@mailmypdf/step-workflow`; it does not introduce another execution system or
change the top-level section/TanStack architecture.

The registry currently contains 66 capability definitions:

- 18 production/certified capabilities;
- 46 implemented capabilities whose live production certification is not
  recorded;
- 2 planned capabilities (`titleLienSearch` and `uccFiling`) that have
  provider-neutral contracts but no reviewed live provider.

Automatic `piiDetection` is implemented because the documents package now has
real detection logic and tests. It remains separate from `privacyRelease`,
which owns human review and the fail-closed disclosure decision.

## Canonical contract

Every capability definition must declare:

- stable ID and semantic version;
- canonical owning package and implementation provenance;
- provider-neutral input and output schemas;
- explicit capability and host requirements;
- dependencies and consequential-action classification;
- security posture, data class, ownership/approval rules, and external effects;
- domain, jurisdiction, and limitation metadata;
- failure modes and fail-closed behavior;
- unit/integration/acceptance fixture evidence;
- planned, implemented, or certified state with evidence and remaining gaps;
- package, adapter, or service runtime bindings.

Public-repository implementations must also record the repository, immutable
revision, license, and approval state. Merely finding code in a public
repository cannot promote a capability.

## Composition modes

The same registry supports three intentionally different decisions:

| Mode | Purpose | What blocks composition |
| --- | --- | --- |
| `plan` | Design or compile a private/workflow-factory plan | Unknown IDs, cycles, impossible applicability, or contradictory not-applicable declarations |
| `execute` | Bind a runnable connector/workflow | Everything in `plan`, plus planned capabilities, missing host requirements, or missing implemented bindings |
| `production` | Certify production execution | Everything in `execute`, plus any required dependency that is not both production and certified |

Required roots and optional roots are resolved separately. Every transitive
dependency of a required root becomes required; optional dependencies remain
optional unless also required elsewhere. The resolver emits actual topological
order even when a dependency is declared later in the source file.

## Compiler manifest

`compileCapabilityManifest()` emits
`mailmypdf.capabilities/v2`. The manifest is self-contained and includes:

- registry, workflow, and capability versions;
- composition mode and requested capabilities;
- complete required/optional dependency closure;
- status and certification for every resolved capability;
- security and applicability metadata;
- exact runtime binding candidates.

The legacy `bindings` projection remains in the v2 artifact for existing host
consumers. New compilers should consume the richer per-capability entries.

`composeWorkflow()` now includes both the composition and compiled capability
manifest in its result. Static factory validity remains separate from runtime
and production evidence; `workflow-quality-certification.ts` continues to own
those later gates.

## Package adapters

`capability-adapters.ts` derives runtime package adapters directly from the
canonical definitions, preventing binding drift. A separate contribution
inventory records packages that support a capability without claiming to own
its runtime contract. This is how `identity-capacity`, `jurisdiction-rules`,
`registry-adapters`, `secured-transactions`, `security`, `documents`, AI,
intelligence, payment, fulfillment, mailing, proof, and acceptance packages
are represented without duplicate registries.

## Runtime and connector use

`CapabilityRuntime` accepts the canonical registry (or an isolated registry
instance for tests) and rejects unregistered handlers. Connector dry runs can
compile plans without side effects, while connector readiness separately
checks authentication, ownership, approval, version compatibility, and live
binding health.

The alias `masterCapabilityRegistry` points to the same object as
`capabilityRegistry`; it is a clearer consumer name, not a second catalog.

## Validation and inventory

`CapabilityRegistry.audit()` checks definition identity, semantic versions,
schemas, dependencies, requirement rationale, cycles, source provenance,
runtime bindings, certification consistency, fixture evidence, and required
human-review/blocking-gate reachability for consequential actions.

`buildCapabilityInventory()` returns machine-readable status, certification,
category, adapter, and gap counts. `renderCapabilityInventoryMarkdown()`
renders all current definitions for an operator or release report.

Run the CI-safe contract gate with:

```sh
pnpm capabilities:check
```

## Constraints and non-goals

- The registry composes existing reusable behavior; it does not invent legal,
  tax, jurisdictional, filing, identity, or vendor behavior.
- A package export proves an implementation boundary exists. It does not prove
  a live provider is healthy; host binding-health checks remain mandatory.
- `foundation`/`planned` capabilities may appear in design plans but cannot
  pass execute or production composition.
- Runtime handlers remain package- or host-owned. The registry stores contracts
  and candidates; it does not absorb provider code.
- Existing section routing, TanStack conventions, canonical workflow identity,
  and step-workflow execution remain unchanged.

## Highest-value next families

The next additions should deepen existing owners before introducing new IDs:

1. production host bindings and acceptance evidence for identity, matter state,
   security, provenance, validation, resilience, and observability;
2. reviewed title/lien search and UCC filing providers, jurisdiction by
   jurisdiction;
3. package-specific strict payload schemas for the highest-risk consequential
   capabilities;
4. redaction rendering/QA, secret detection, file-type/resource limits, and
   secure export/restore under the existing document/security/proof owners;
5. authority and deadline coverage for tax, housing, benefits, court procedure,
   and secured transactions;
6. public-repository adapter intake with immutable source, license, security,
   fixture, and replacement evidence.

## Open operational questions

- Which currently implemented capabilities are actually bound and healthy in
  each production host/environment?
- Which jurisdictions have reviewed authority coverage rather than the current
  `unspecified` applicability fallback?
- Which consequential capabilities have capability-level acceptance fixtures,
  rather than only package-level unit/integration evidence?

Those are release-evidence questions. They must be answered by deployment and
acceptance records, not by promoting metadata in the registry.
