# Next Action

**Date:** 2026-08-19
**Current state:** CP523 workflow complete. 815/815 tests passing. Build passing.

## Recommended next workflow

### CP05 (IRS Notice)

- MSV: 1,000 (highest among remaining candidates)
- CPC: $10.52
- Competition: LOW
- Status: Not yet implemented
- Domain: IRS verification notice — taxpayer must verify identity/return items
- Reuse: Shares extraction patterns with CP2000, same engine, same factory pipeline
- Complexity: Medium — verification focus rather than balance/levy

### Alternative candidates (in priority order)

1. **Notice of Deficiency** — 880 MSV, $20.85 CPC. Statutory notice with appeal rights. Higher legal complexity.
2. **Notice of Levy** — 880 MSV, $13.45 CPC. Collection action. Shares CDP concepts with CP504/CP523.
3. **CP3219A** — Notice of Proposed Assessment. Similar to CP2000 but with assessment implications.

## Remaining production hardening

1. **Connect security.ts to all routes** — injection detection is implemented but not wired into all routes
2. **Wire two-pass validation into routes** — CP2000/CP504/CP523 have validation modules but routes use generic `validateDraft`
3. **Provenance tracking** — draft-provenance.ts is not connected to any route
4. **Persistence wiring** — case-repository is tested but not wired into routes for save/load
5. **Document intelligence** — browser-side PDF extraction remains a long-term weakness

## Do NOT do next

- Code enforcement (abandoned)
- Multiple workflows simultaneously
- Giant unrelated audit
- Architecture redesign
