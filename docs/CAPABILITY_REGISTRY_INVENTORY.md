# Capability Registry Inventory

Updated 2026-09-27 from the live `mailmypdf-all-main` checkout.

## Scope audited

The registry extends `packages/workflows`, which already owns workflow
manifests, pipelines, runtime handlers, certification, acceptance, and domain
adapters. The existing top-level section architecture and
`@mailmypdf/step-workflow` execution convention remain unchanged.

## Current inventory

| Surface | Current state |
| --- | --- |
| Canonical capability definitions | 66 registered IDs: 18 certified, 46 implemented, 2 planned |
| Contract metadata | Version, input/output schema, requirements, security posture, applicability, failure modes, fixtures, certification state, and runtime bindings |
| Package adapters | 23 runtime owner packages derived from canonical bindings, plus explicit supporting-package contributions |
| Composition | Discovery, filtering, true topological dependency closure, separate required/optional closure, and plan/execute/production modes |
| Validation | Contract identity/version, source provenance, requirements, dependencies, cycles, fixtures, certification, bindings, consequential gates, and applicability |
| Existing factory integration | `composeWorkflow()` and `WorkflowManifest` remain authoritative and now return a compiled v2 capability manifest |
| Existing runtime integration | `CapabilityRuntime` and `PlatformCapabilityBundle` remain authoritative for execution bindings and consume the canonical registry |

## Certification vocabulary

- `planned`: a contract or capability family is named, but the implementation,
  binding, or evidence is incomplete.
- `implemented`: reusable workspace logic exists and can be bound, but live
  production certification is not established by the registry alone.
- `certified`: the existing registry's production evidence says the capability
  is eligible for production workflows. This is not inferred from package
  existence.

The legacy `status` field is retained for compatibility with existing workflow
certification (`foundation`, `partial`, `implemented`, `production`). New
factory code should consume `certification.state` plus the runtime binding
status rather than treating a package name as proof of readiness.

## Implemented and registered now

The current registry covers identity and matter state; secure document intake,
storage, scanning, and retention; document intelligence and AI execution;
facts, provenance, timelines, deadlines, findings, contradictions,
discrepancies, requirements, evidence, research, risk, strategy, drafting and
validation; approval gates; PDF and packet assembly; pricing, payment,
address verification, mailing, tracking, notifications, proof, archive,
resilience, observability, and acceptance testing.

The latest shared additions also register secure sharing, legal holds, IRS/tax
notice normalization, creative-finance amortization, translation boundaries,
template similarity, identity verification, signatures, notarization, and
e-filing contracts. Automatic PII detection is now implemented and tested; the
separate privacy-release gate still requires human review. UCC filing and
title/lien search have provider-neutral
contracts, but remain explicitly planned until jurisdictional providers and
certification evidence exist.

The complete machine-readable report is available through
`buildCapabilityInventory()`, and the complete table can be produced with
`renderCapabilityInventoryMarkdown()`. The contract and operating rules are in
`docs/architecture/MASTER_CAPABILITY_REGISTRY.md`.

Existing package adapters are registered for identity-capacity,
jurisdiction-rules, registry-adapters, secured-transactions, security,
documents, document-intelligence, AI, packet-builder, payment-fulfillment,
fulfillment, mailing-client, proof, workflow-acceptance, step-workflow,
notifications, and pricing.
The `@mailmypdf/capability-services` package supplies the provider-neutral
secure-file, tax, creative-finance, translation, and template services.

## Gaps and next capability families

These are gaps, not silently invented capabilities:

1. Fill package-specific input/output schemas and fixture paths where the
   current contract uses the safe structural default.
2. Replace metadata-only package bindings with explicit runtime executor
   bindings for each deployed host and environment.
3. Expand jurisdiction coverage from `unspecified` to reviewed rule-pack
   coverage, especially for secured transactions, housing, benefits, and
   court procedures.
4. Add external-source provenance fields and adapters only after license,
   security, maintenance, and compatibility review. Public repositories are
   candidate implementation sources, not certified capabilities.
5. Add capability-level acceptance fixtures for every consequential package
   boundary, then promote only the capabilities with passing evidence.

## Public-repository ingestion boundary

Future public-repo collection should produce an adapter proposal containing the
source URL, immutable commit, license, extracted capability claims, dependency
graph, security review, fixture mapping, and certification gaps. It must enter
the registry as `planned` or `implemented` until the MailMyPDF contract and
acceptance gates pass; it must never be promoted merely because an upstream
repository advertises a feature.
