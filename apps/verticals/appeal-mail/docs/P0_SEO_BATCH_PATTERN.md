# P0 SEO Batch Implementation Pattern

## Workflows in this batch
1. drivers-license-suspension
2. license-revocation-appeal
3. unemployment-denial
4. insurance-claim-denial (new dedicated route)
5. ssdi-denial (new dedicated route)

## Architecture

### Shared infrastructure (new files)
- `src/domain/workflow-landing-content.ts` — per-workflow landing data: H1, subheadline, whatItMeans, whoIsThisFor, commonReasons, whatMatters, evidenceChecklist, deadlineGuidance, whatWeDo, ctaText, faqs, relatedWorkflowIds
- `src/components/workflow/workflow-landing-section.tsx` — shared components: WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema

### Per-workflow changes
1. **Workspace component**: H1 → H2 "Build and send your appeal", add `id="workflow-start"` to understand section
2. **Route file**: Import shared components, wrap in `<>` with landing section → workspace → FAQ → related workflows
3. **Route head**: Hardcoded title/description/OG/Twitter (not from catalog), canonical, Service + BreadcrumbList + FAQPage JSON-LD
4. **Test**: Update H1 assertion to H2 assertion

### Special case: insurance-claim-denial
Uses `AppealWorkflowWorkspace` with `suppressH1` prop instead of a dedicated workspace component. The prop conditionally renders H2 when true, H1 when false (default), so non-batch workflows using the same component are unaffected.

### Out-of-batch rule
Workflows NOT in the current batch must not be modified. If they were modified during development, revert before committing.

## Verification checklist
- [x] 750/750 tests passing
- [x] Clean production build
- [x] 33 workflows registered and reachable
- [x] All 5 pages HTTP 200
- [x] Unique H1 per page (count = 1)
- [x] Title, description, canonical, OG, Twitter on all 5
- [x] Service + BreadcrumbList + FAQPage schema on all 5
- [x] #workflow-start anchor on all 5
- [x] Workspace H2 "Build and send your appeal" on all 5
- [x] No noindex
- [x] No duplicate canonicals
- [x] Sitemap includes all 5 routes
- [x] Non-batch workflows unchanged

## Evidence to justify expansion
- Google Search Console shows the 5 batch pages indexing
- Organic impressions/clicks for target keywords
- User testing confirms landing → CTA → workspace flow
- No Core Web Vitals regressions
