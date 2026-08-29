# Immigration Mail SEO Keyword Map

Research basis: Keyword.com US English keyword discovery, August 2026.

## Strategy

Immigration Mail should own **notice/document understanding + evidence response** intent for USCIS correspondence, while avoiding competition with simple case-status queries.

## Priority clusters

### High-volume notice education
- I-797 — 18,100/mo
- I-797C — 8,100/mo
- I-797 approval notice — 3,600/mo
- USCIS G-28 — 4,400/mo
- I-797C notice of action — 1,000/mo

### Action-ready
- request for evidence USCIS — 720/mo
- request for evidence RFE — 720/mo
- USCIS denial notice — 50/mo
- USCIS rejection notice — 170/mo
- USCIS RFE / evidence response variants
- USCIS notice to appear — 210/mo

### Specialized notices
- biometrics appointment notice — 880/mo
- I-765 rejection notice — 880/mo
- I-485 denial notice — 110/mo
- interview notice USCIS — 110/mo
- I-290B — 390/mo

## Recommended architecture

Immigration Mail
├── I-797 / I-797C explained
├── Request for Evidence (RFE)
├── Notice of Intent / NOID
├── Denial / rejection
├── Biometrics notice
├── Interview notice
├── I-290B / administrative appeal
└── Form-specific response workflows

## Rule

Use high-volume I-797 pages for discovery, then route readers into response-specific workflows. Distinguish informational USCIS documents from documents that actually require a response.