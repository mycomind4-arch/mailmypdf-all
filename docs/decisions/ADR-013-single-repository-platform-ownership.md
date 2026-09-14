# ADR-013: Keep MailMyPDF platform ownership in this monorepo

## Status

Accepted

## Date

2026-09-14

## Context

MailMyPDF previously referenced a separate `mailmypdf-platform` repository for shared contracts and infrastructure. The active implementations now live in `mailmypdf-all/packages/*`, while the separate repository is obsolete and caused ambiguous ownership in documentation and agent guidance.

## Decision

`mailmypdf-all` is the sole canonical MailMyPDF repository. Shared platform code belongs in `packages/*`; vertical-specific code belongs in `apps/verticals/*`. Historical Platform material is archival only and must not be treated as an active dependency or source of truth.

## Consequences

- New shared capabilities are added to this monorepo.
- Documentation refers to the monorepo's shared packages rather than a separate Platform repository.
- Any archival recovery is performed deliberately from preserved history, never through an active runtime dependency.
