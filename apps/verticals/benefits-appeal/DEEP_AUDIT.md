# DEEP_AUDIT.md — Benefits Appeal

**Last updated:** 2026-08-20
**Commit:** 601a5b2a

---

## Architecture

### Stack
- **Framework:** React + TanStack Router (file-based, type-safe)
- **Build:** Vite + Nitro (Cloudflare Workers output)
- **Styling:** Tailwind CSS with custom design system (government-paper aesthetic)
- **Testing:** Node.js native test runner (`node:test`)
- **Deployment:** Cloudflare Workers (prebuilt Nitro)

### Design System
- **Aesthetic:** Government-paper — cream paper background, slate ink text, emerald stamp accent
- **Typography:** Instrument Serif for headings, system sans for body, monospace for labels
- **Components:** `postmark`, `eyebrow`, `btn-amber`, `btn-outline`, `card`, `envelope-card-hover`
- **Color tokens:** `--paper`, `--paper-deep`, `--ink`, `--ink-soft`, `--stamp`, `--rule`

### Key Directories
```
src/
  components/     UI components (site-header, site-footer, workflow-wizard, xray, stress-test, timeline, etc.)
  domain/        Business logic (appeal-catalog, appeal, decision, ground, evidence, argument, review, packet, proof, xray, stress-test, timeline, workflows)
  platform/      Platform layer (text-extraction, extract-fn, xray-fn, stress-test-fn, timeline-fn, checkout-fn, appeal-repository, supabase, mailmypdf)
  routes/        TanStack Router file-based routes
tests/           Node.js native tests
```

## Product Shell

### Routes
| Route | Type | Status |
|------|------|--------|
| `/` | Homepage | Complete |
| `/workflows` | Workflow directory | Complete |
| `/appeal/$slug` | Dynamic: category + workflow pages | Complete |
| `/workflows/denied-claim` | Insurance Appeal (executable) | Complete |
| `/workflows/government-decision` | Legacy shared wizard | Legacy |
| `/workflows/court-ruling` | Legacy shared wizard | Legacy |
| `/workflows/reconsideration` | Legacy shared wizard | Legacy |
| `/about` | About page | Exists |
| `/contact` | Contact page | Exists |
| `/faq` | FAQ page | Exists |
| `/pricing` | Pricing page | Exists |
| `/privacy` | Privacy policy | Exists |
| `/terms` | Terms of service | Exists |
| `/dashboard` | User dashboard | Exists |
| `/auth` | Auth page | Exists |
| `/resources` | Resources index | Exists |
| `/resources/$slug` | Resource articles | Exists |

### Workflow Catalog
- **Total workflows:** 20
- **Implemented:** 1 (Insurance Claim Appeal)
- **Coming soon:** 19
- **Categories:** 7 (Insurance, Disability & Social Security, Unemployment, Government Benefits, Workers' Compensation, Veterans, Administrative)

### SEO Architecture
- Homepage: title, description, OG tags, canonical, JSON-LD WebSite + SearchAction
- Workflow directory: title, description, OG, canonical, JSON-LD WebSite
- Category pages: title, description, OG, canonical, JSON-LD CollectionPage
- Workflow pages: title, description, OG, canonical, JSON-LD WebPage
- All 20 catalog entries have unique seoTitle and seoDescription

### Insurance Appeal Pipeline
1. **Upload** — File upload, text extraction (PDF, images via OCR)
2. **Extract** — Decision extraction (denial type, key fields, deadline)
3. **X-Ray** — Cross-document analysis (contradictions, date conflicts, unaddressed evidence)
4. **Timeline** — Case history reconstruction with integrity status
5. **Grounds** — Appeal ground identification and editing
6. **Evidence** — Evidence linking to grounds
7. **Arguments** — Argument construction with contradiction detection
8. **Stress Test** — Adversarial review, argument scoring (0-100)
9. **Draft** — Appeal letter assembly from approved findings
10. **Final Review** — Draft scan for exaggerated claims
11. **Readiness** — Readiness score and checklist
12. **Packet** — Appeal packet assembly with exhibit index
13. **Mailing** — Mail option selection (Standard/Certified/Registered)
14. **Checkout** — Payment session creation
15. **Proof** — SHA-256 proof certificate, tracking

### Security Gates
- User review required before mailing (no automatic mail)
- No fabricated facts (AI never invents evidence)
- No legal advice (not a law firm)
- Encrypted document storage
- User-controlled data deletion

## Test Coverage
- **Catalog integrity:** 13 tests (slugs, routes, statuses, SEO, categories, content arrays)
- **Implemented vs Coming Soon:** 3 tests (executable correctness, count relationship)
- **Category structure:** 3 tests (count, non-empty, valid categories)
- **Search:** 7 tests (empty, title, keyword, category, specific terms, nonsense)
- **Stats:** 1 test (consistency)
- **Slug lookup:** 2 tests (valid, invalid)
- **Platform core:** Multiple tests (extraction, mailing, checkout, proof)
- **Platform documents:** Multiple tests
- **Platform intelligence:** Multiple tests (X-Ray, stress test, timeline)
- **Ownership/versioning:** Multiple tests
- **Total:** 165 tests, 0 failures
