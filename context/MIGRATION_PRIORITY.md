# Migration Priority — Next Steps (2026-09-21)

## Summary of Inventory

Audit complete: all verticals inventoried. Classification by migration complexity and priority.

### ✅ Ready to Delete (Fully Superseded)
These old standalone apps have been completely replaced by comprehensive new architectures with no unique logic:

1. **claim-proof** — 948 lines (9 src + components), 0 tests → 30 workflows ✓
2. **permit-reply** — 108K, 9 src → 30 workflows ✓
3. **tenant-reply** — 108K, 9 src → 30 workflows ✓
4. **legal-defense** — 32K, 4 src, 1 test → 30 workflows ✓

**Action**: Delete these four directories from `/Users/macdizzle/dev/mailmypdf-all/` and mark DELETED in ledger.

---

## 🔴 CRITICAL — Domain Layer Recovery Outstanding

### code-enforcement (P1 blocker)
**Status**: Domain layer explicitly missing (FACTORY_STATUS: "FairProcess Code Enforcement has 36 archive-changed paths requiring integration review; its domain layer is not present.")

**What exists in old system:**
- 87 source files, 11 tests, 952K
- Domain layer: jurisdiction, evidence-graph, draft-engine, gold-certification, property-intelligence, law-enforcement-event, due-process reasoning
- Adapters, investigation pipeline, findings, store logic

**What exists in new system:**
- 30 workflows with config/schema/seo per workflow
- No domain/ layer, no shared intelligence adapters

**Next action**: 
1. Compare `/Users/macdizzle/dev/mailmypdf-all/code-enforcement/src/domain/` against:
   - `packages/intelligence/`
   - `packages/workflows/`
   - New workflow schema files in `code-enforcement/workflows/*/schema.ts`
2. Identify what migrates to shared packages vs. what stays as code-enforcement-specific logic
3. Build domain layer for new architecture if needed

---

## 🟡 HIGH PRIORITY — Large Test Suites (Unique Domain Logic)

### small-business 
**78 files, 215 TESTS (!!!), 400K** — Test suite size indicates mature domain logic

### records-request
**197 files, 85 tests, 1.6M** — Significant system

### immigration-mail
**208 files, 43 tests, 3.0M** — Second-largest system after notice-respond

**Action strategy**: 
1. Sample one (recommend: small-business due to test count)
2. Identify test patterns and domain assertions
3. Port test fixtures to new architecture
4. Migrate domain logic via shared packages (don't duplicate)

---

## 🟢 MEDIUM PRIORITY — Code Review Required

### dispute-mail
**86 files, 19 tests, 612K** — Mid-size system

### insurance-claims
**23 files, 4 tests, 156K** — Smallest code footprint in this tier

---

## 🔵 ALREADY HANDLED

### notice-respond (3.3M, 290 files, 53 tests)
- **CP14 golden path just completed** (2026-09-21, FACTORY_STATUS entry)
- Verify migration is complete — check that domain layer is present if needed

### benefits-appeal
- **Already documented** in `benefits-appeal/MIGRATION.md`
- Old system is read-only reference; useful code already migrated to shared packages
- Do not re-scan or bulk-copy

---

## Recommended Order for Next Sessions

1. **Delete the four ready-to-delete verticals** (quick win)
2. **Audit code-enforcement domain layer** (P1 blocker)
3. **Sample small-business** for test migration pattern
4. **Audit records-request & immigration-mail** (largest remaining)
5. **Verify notice-respond completeness** (already partially migrated)

---

## Deletion Checklist (when ready)

Before deleting each old vertical from `/Users/macdizzle/dev/mailmypdf-all/`:

- [ ] No imports/references from other code (grep -r)
- [ ] No git tags or branches depend on it (git tag -l, git branch -l)
- [ ] ledger row updated with final status
- [ ] Pre-deletion snapshot created (git tag, optional local backup)
- [ ] Commit the deletion separately with ledger update

Each deletion is a separate git commit, not a bulk delete.
