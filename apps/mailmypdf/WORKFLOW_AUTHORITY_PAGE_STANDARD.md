# MailMyPDF Workflow Authority Page Standard

LOCKED cross-repo standard.

## Core rule

A MailMyPDF workflow SEO page must be useful enough to compete as an authority resource **before the executable workflow exists**. Adding execution later should make the page categorically more useful; execution is not allowed to compensate for thin informational content.

The shared page factory supplies layout, navigation, schema, trust patterns, related-workflow presentation, and conversion structure. It must **not** supply generic domain prose that is duplicated across workflow pages.

## Two registries, two jobs

Do not confuse public SEO authority coverage with workflow implementation maturity.

- `src/lib/workflow-seo-catalog.ts` is the master public SEO authority catalog. The project workflow specs are the source of truth for the planned ~330 workflow nodes.
- `WORKFLOW_INVENTORY.json` is the smaller legacy/model/execution inventory. Its current count is not the target public SEO footprint and it must not be described as the master workflow catalog.

A workflow can have a complete public authority page long before its execution engine is built.

## Publication states

Every public workflow node is explicitly one of:

1. `DRAFT` — route/spec node may exist, but content is incomplete. It is never indexable and never renders an executable CTA merely because a route exists.
2. `SEO_READY` — complete authority content has passed the automated Authority Gate. It may be indexable, subject to the site's separate launch/indexing switch. Its CTA must remain informational/product-routing unless execution is separately verified.
3. `EXECUTABLE` — the same SEO-ready authority resource plus a separately verified authenticated execution entry point. The SEO content still has to pass the same Authority Gate.

Never promote a record by changing its state label alone. CI must reject `SEO_READY` or `EXECUTABLE` records that do not pass the gate.

## Required authority content

The canonical content contract is `WorkflowSeoAuthorityContent` in `src/lib/workflow-seo-catalog.ts`. An SEO-ready page must contain workflow-specific substance for all of these areas:

1. Primary search intent and keyword target
2. Secondary search intents/keywords
3. Unique SEO title, H1, and meta description
4. Substantial overview/problem explanation
5. Document/form/notice identification where applicable
6. Issuer, agency, program, contract, court, or domain context
7. When to use this resource
8. When not to use it / professional-help boundaries
9. What to inspect on the controlling document
10. Deadlines and timing guidance tied to controlling instructions/current authority
11. Information to confirm
12. Evidence/document checklist
13. Workflow-specific step-by-step response process
14. Issues and requirements to check
15. Common mistakes and failure modes
16. Multiple realistic scenarios
17. Possible response paths/outcomes without guaranteeing one result
18. What a complete response/proof packet should contain
19. Submission, filing, mailing, tracking, and proof guidance
20. Practical final checklist
21. Templates and tools that may help
22. At least five substantial workflow-specific FAQ question-and-answer pairs
23. Glossary where domain terminology materially helps
24. Current authoritative sources and review dates
25. Meaningful upstream/downstream related workflows
26. A truthful disclaimer/safety boundary
27. A truthful CTA reflecting the actual publication/execution state

## Authority Gate

The repository enforces authority quality in `src/lib/workflow-authority-gate.ts` and CI runs it through:

```bash
pnpm --filter ./apps/mailmypdf seo:authority:validate
```

An indexable page must score at least **85/100** across:

- search-intent coverage
- workflow specificity
- source grounding
- evidence guidance
- process usefulness
- FAQ coverage
- internal-link depth
- content uniqueness
- safety/truthfulness
- conversion usefulness

The score is not a substitute for required sections. Critical failures block publication even if the mathematical score would otherwise pass.

Current hard floors include substantive workflow-specific overview/context, detailed document inspection guidance, evidence and information checklists, at least five meaningful process steps, at least five common mistakes, at least three realistic scenarios, at least three response paths, substantial filing/mailing guidance, at least five answered FAQs, authoritative sources with review dates, meaningful related workflows, and a **1,200 substantive-word minimum across authority fields**.

The 1,200-word figure is only an anti-thin-content floor. It is **not a target word count** and does not make a generic page acceptable. Information density, specificity, source quality, and usefulness control publication.

## Uniqueness rule

Shared components, navigation, labels, disclaimers, and common product controls may repeat. Substantive domain copy may not.

The Authority Gate checks duplicate metadata and substantive page similarity. Pages that cross the configured similarity threshold are blocked until the overlapping domain prose is made genuinely workflow-specific.

Do not create 330 pages by swapping nouns in one template.

## Source and truth rules

High-stakes claims require current source verification. Prefer official, primary, or regulator sources where available. Never invent or universalize:

- deadlines
- eligibility
- filing methods
- recipients or addresses
- agency requirements
- policy or contract language
- legal conclusions
- facts or evidence
- approval likelihood
- success rates or outcomes

Source review dates describe when MailMyPDF checked a source; they do not freeze the rule in time. If the source document or current authority conflicts with site copy, the current controlling source wins.

Do not use fabricated testimonials, customer counts, ratings, search-volume claims, success rates, or unsupported security claims. Do not use "bank-grade" or "bank-level" language.

## Bulk production workflow

Agents must build authority pages in topical clusters, not as an uncontrolled one-shot content dump:

**spec node -> DRAFT catalog entry -> research/source packet -> rich authority content -> Authority Gate -> review -> SEO_READY -> later verified execution -> EXECUTABLE**

The project specs define the planned workflow surface. First normalize/deduplicate canonical IDs and routes. Then research and complete pages cluster by cluster so related pages can be differentiated and internally linked intentionally.

A failing gate is a content/build failure, not an invitation to lower thresholds, pad word count, delete useful validation, or mark the page ready anyway.

## SEO and execution boundary

`SEO_READY` means the informational resource is complete. It does **not** mean the workflow engine exists.

`EXECUTABLE` requires a separately verified execution href. Public browsing can remain open while authenticated execution stays behind the appropriate account/auth boundary.

The page should use a product/directory CTA while informational only and switch to a `Start workflow` CTA only after execution has been verified.

## Architecture

Canonical public host: `https://mailmypdf.ai`.

Prelaunch indexing remains subject to the owner's global launch switch even when a page passes the per-page Authority Gate.

Architecture source of truth: `mailmypdf-platform`. Do not create a competing URL scheme, page architecture, global navigation model, workflow runtime, or fulfillment system.
