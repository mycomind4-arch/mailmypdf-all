# Foundation progress

The foundation pass is intentionally separate from workflow implementation.

## Completed on `foundation/workflow-ready`

- Real request persistence path
- Owner-aware request model and dashboard data path
- D1 runtime integration work
- Cryptographic audit-chain implementation and verification
- Per-request audit-tail compare-and-swap for concurrent lifecycle writers
- Transactional request creation with initial audit event
- Fulfillment webhook deduplication
- Durable outbound fulfillment reservation before provider submission
- Deterministic fulfillment idempotency boundary
- Document attestation path
- Workflow factory contract and tests
- Records domain-pack capability contract aligned to MailMyPDF Platform
- Versioned jurisdiction policy contract (fail-closed)
- Production → evidence → finding → action domain boundary
- CI coverage for typecheck/test/build
- Explicit MailMyPDF Platform consumption boundary

## External / deployment blockers

- Install the real identity resolver.
- Provision and apply real D1 resources.
- Verify deployed Cloudflare E2E execution.
- Consume published MailMyPDF Platform packages once platform issue #30 is completed.

## Workflow-ready boundary

The Records Requests vertical is ready for domain workflow implementation without introducing another workflow engine or duplicating the platform's generic intelligence, proof, fulfillment, or lifecycle contracts.

The first flagship workflow is `code-enforcement-records`.
