# MailMyPDF Current State

This is a compact operational snapshot, not a substitute for verification. Update it after material changes.

**Snapshot assembled:** 2026-09-08  
**Latest build baseline documented in repo:** 2026-08-28  
**Topology migration documented:** 2026-08-31  
**Payment/fulfillment consolidation documented:** 2026-09-01

## Canonical topology

- `apps/mailmypdf` — canonical host.
- `apps/verticals/*` — 13 canonical vertical modules.
- `packages/*` — shared platform capabilities.
- One public host with path-based vertical routing is the documented deployment architecture.

## Last documented build baseline

The repo's `BUILD_STATUS.md` records successful baseline builds for 11 applications as of 2026-08-28. It explicitly does **not** certify a fresh full monorepo build after the later topology/payment consolidation work.

Therefore, do not say the current head is production-ready solely from that baseline.

## Documented shared-platform migration

The repository records payment/fulfillment reconciliation for Notice Respond, Immigration Mail, Dispute Mail, and Appeal Mail around the canonical shared payment/fulfillment and mailing contracts. Provider-status normalization is documented under the shared fulfillment package.

## Known repository integrity blocker

`BUILD_STATUS.md` records that `pnpm-workspace.yaml` uses the current topology while `pnpm-lock.yaml` still contains importer/link paths from the pre-migration layout. The lockfile should be regenerated and the current head installed/built/tested before frozen-lockfile production readiness is claimed.

## Related systems

- FairProcess 2.0 is independently implemented on Next.js/OpenNext + Cloudflare Workers, D1, and R2, with evidence, timeline, findings, parcel intelligence, and due-process rule analysis.
- Ruthless Investigator has an implemented investigation-council architecture centered on evidence lineage, competing hypotheses, adversarial analysis, and uncertainty.
- Advanced Search documents implemented core orchestration/evidence normalization/search architecture, with provider credentials/runtime wiring remaining deployment configuration.

## Verification rule

For any task that depends on present runtime truth, inspect the current branch and affected tests/configuration. Treat this snapshot as a routing aid, not proof.

## Next state-maintenance action

After a meaningful implementation or audit, update only the affected bullets here and link to a compact checkpoint or ADR. Move detailed evidence into the relevant spec/audit rather than expanding this file indefinitely.