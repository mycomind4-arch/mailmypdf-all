# Notice Respond — SEO Keyword Map

Updated from Keyword.com US English research on 2026-08-17.

## Strategy

Notice Respond should own a broad **notice-response** topic, but acquisition should come primarily from specific notice identifiers, agency names, and problem-driven long-tail searches. High-volume informational terms should be used as education/discovery pages; response-specific terms should be the primary conversion targets.

## Priority tiers

### Tier 1 — build / optimize first

| Cluster | Primary terms | Evidence | Intent |
|---|---|---:|---|
| IRS CP14 | irs govcp14; irs notice cp14; irs cp14; cp14 notice | 3,600; 1,000; 880; 720 MSV | High relevance; notice understanding + action |
| IRS CP2000 | cp2000; cp2000 irs; cp2000 letter from irs; cp2000 response letter | 1,900; 590; 170; 20 MSV | Strong problem/product fit |
| IRS general | irs notice; notice of deficiency; notice of levy; audit letter from irs | 1,300; 880; 880; 880 MSV | Broad tax-notice acquisition |
| USCIS RFE / notice | request for evidence uscis; request for evidence rfe; USCIS notice | 720; 720; 390 MSV | Strong immigration workflow fit |
| Court civil response | court summons; civil summons; answering a summons | 2,900; 1,300; 210 MSV | Strong formal-response intent |

### Tier 2 — expand after Tier 1

| Cluster | Primary terms | Evidence |
|---|---|---:|
| USCIS informational | i 797; i 797c; i 797 approval notice; receipt notice uscis | 18,100; 8,100; 3,600; 1,000 MSV |
| DMV | dmv notice; notice of suspension dmv; vehicle registration renewal notice | 110; 90; 1,000 MSV |
| SSA | social security notice; notice of award letter from social security; notice of award | 140; 210; 170 MSV |
| Court specialty | small claims summons; debt collection summons; eviction summons | 170; 170; 320 MSV |
| Benefits | benefits notice / overpayment / eligibility variants | Low volume in current dataset; commercially relevant |

### Tier 3 — long-tail conversion pages

Create these when the workflow is genuinely supported:

- cp14 notice but already paid
- dispute cp14 notice
- response to cp2000 letter
- cp2000 response letter
- irs audit letter response
- tax notice response letter
- answering a summons
- debt collection court summons
- small claims court summons
- notice of suspension dmv
- USCIS request for evidence I-130
- USCIS request for evidence I-485
- USCIS denial notice
- USCIS rejection notice

## Important filtering rules

### Do not chase raw volume without intent validation

Some large-volume terms are misleading:

- `summons` is heavily mixed with jury-duty intent.
- `i 797` / `i 797c` are mostly informational and should not be treated as direct conversion terms.
- `notice of transfer and release of liability` is a major DMV volume cluster but is not inherently a response-letter problem.

Use these terms for educational pages that lead to the relevant workflow only when the product genuinely helps with that situation.

### Build pages around user problems, not keyword stuffing

Each workflow page should answer:

1. What kind of notice is this?
2. What is the notice asking the recipient to do?
3. What dates/reference numbers matter?
4. What documents are useful?
5. What response paths may exist?
6. How does Notice Respond organize the work?
7. When should a professional be consulted?
8. How can the final response be reviewed and mailed with proof?

## Recommended site hierarchy

```text
/
  Notice Respond — master directory

/tax-notices/
  /irs-notices/
    /irs-cp14/
    /irs-cp2000/
    /irs-cp504/
    /irs-notice-of-deficiency/
    /irs-notice-of-levy/
    /irs-audit-letter/

/immigration-notices/
  /uscis-notices/
    /uscis-i-797/
    /uscis-request-for-evidence/
    /uscis-denial-notice/
    /uscis-rejection-notice/

/court-notices/
  /civil-summons/
  /small-claims-summons/
  /debt-collection-summons/
  /eviction-summons/

/state-agencies/
  /dmv-notices/
  /dmv-suspension-notice/
  /ssa-notices/
  /benefits-notices/

/property-notices/
  /code-enforcement-notice/
  /permit-correction-notice/
  /zoning-notice/
```

The existing interactive `/workflows/...` routes can remain the application layer. Public SEO pages should link into the appropriate interactive workflow rather than duplicating its entire UI.

## Internal-linking model

Every leaf page should link upward to its category directory and the master Notice Respond directory. Related notice pages should cross-link where the user may reasonably encounter adjacent documents (for example CP2000 → CP2501 → CP3219A).

## Keyword tracking recommendation

Track a deliberately small set of primary terms rather than filling the Keyword.com account with near-duplicates. Prioritize terms that combine identifiable notice type + action/problem. Add informational terms when they support a strong workflow funnel.


## Workflow Routes (Live as of 2026-08-27)

The following interactive workflow routes are live in production:

| Route | Workflow ID | SEO Title | Keywords |
|------|-------------|-----------|----------|
| /workflows/cp2000-response | cp2000-response | Respond to an IRS CP2000 Notice | cp2000, cp2000 irs, cp2000 letter |
| /workflows/cp14-response | cp14-response | Respond to an IRS CP14 Notice | cp14 notice, irs cp14 |
| /workflows/cp504-response | cp504-response | Respond to an IRS CP504 Notice | CP504, intent to levy |
| /workflows/cp523-response | cp523-response | Respond to an IRS CP523 Notice | CP523, installment default |
| /workflows/irs-notice | irs-notice | Respond to an IRS Notice | irs notice, irs letter |
| /workflows/court-summons | court-summons | Respond to a Court Summons | court summons, civil summons |
| /workflows/agency-action | agency-action | Respond to an Agency Action | agency action, agency notice |
| /workflows/file-appeal | file-appeal | File an Appeal | file appeal, appeal filing |
| /workflows/tax-notice | tax-notice | Respond to a Tax Notice | tax notice, tax authority letter |
| /workflows/code-enforcement | code-enforcement | Respond to a Code Enforcement Notice | code enforcement, municipal violation |
| /workflows/permit-correction | permit-correction | Respond to a Permit Correction Notice | permit correction, building permit |
| /workflows/dmv-notice | dmv-notice | Respond to a DMV Notice | dmv notice, license suspension |
| /workflows/ssa-notice | ssa-notice | Respond to an SSA Notice | ssa notice, social security determination |
| /workflows/uscis-notice | uscis-notice | Respond to a USCIS Notice | uscis rfe, uscis notice |
| /workflows/benefits-notice | benefits-notice | Respond to a Benefits Notice | benefits notice, overpayment notice |

Each route has:
- Full SEO metadata (title, description, OpenGraph)
- Structured FAQ section (4+ questions with JSON-LD)
- LLM-powered document analysis + draft generation
- Complete workflow pipeline (upload → analyze → draft → review → mail → checkout)
