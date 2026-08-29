# Master Workflow Registry

**Date:** 2026-08-27
**Status:** Source of truth — every workflow in the ecosystem

---

| ID | Title | Vertical | Repo | Engine | Maturity | Route? | Catalog? | MSV | CPC | Competition | Research? | Prod Status | Next Action |
|----|-------|----------|------|--------|----------|--------|---------|-----|-----|-------------|-----------|-------------|-------------|
| cp2000-response | Respond to an IRS CP2000 Notice | notice-respond | notice-respond | document-action | gold | ✅ | ✅ | 1900 | ✅ enforced | ✅ 15 tests | needed | gold | Maintain Gold |
| cp14-response | Respond to an IRS CP14 Notice | notice-respond | notice-respond | document-action | authority | ✅ | ✅ | TBD | TBD | TBD | needed | authority | Maintain authority |
| cp504-response | Respond to an IRS CP504 Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 1900 | 13 | TBD | needed | functional | Upgrade to authority |
| cp523-response | Respond to an IRS CP523 Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 390 | 26 | low | needed | functional | Maintain functional |
| irs-notice | Respond to an IRS Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | TBD | TBD | TBD | needed | functional | Upgrade to authority |
| court-summons | Respond to a Court Summons | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | TBD | TBD | TBD | needed | functional | Upgrade to authority |
| agency-action | Respond to an Agency Action | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | TBD | TBD | TBD | needed | functional | Upgrade to authority |
| file-appeal | File an Appeal | notice-respond | notice-respond | appeal | functional | ✅ | ✅ | 1300 | TBD | TBD | needed | functional | RESEARCH: may belong in appeal-mail |
| tax-notice | Respond to a Tax Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 2900 | 14 | medium | ✅ done | functional | Maintain functional |
| code-enforcement | Respond to a Code Enforcement Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 720 | 8 | low | ✅ done | functional | Maintain functional |
| permit-correction | Respond to a Permit Correction Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 480 | 7 | low | ✅ done | functional | Maintain functional |
| dmv-notice | Respond to a DMV Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 1600 | 9 | medium | ✅ done | functional | Maintain functional |
| ssa-notice | Respond to an SSA Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 1300 | 11 | medium | ✅ done | functional | Maintain functional |
| uscis-notice | Respond to a USCIS Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 880 | 18 | medium | ✅ done | functional | Maintain functional |
| benefits-notice | Respond to a Benefits Notice | notice-respond | notice-respond | document-action | functional | ✅ | ✅ | 1100 | 10 | medium | ✅ done | functional | Maintain functional |
| i-797-analysis | I-797 Analysis | immigration-mail | immigration-mail | document-action | blueprint | — | — | 18100 | TBD | TBD | needed | planned | Build in canonical repo |
| i-797c-analysis | I-797C Analysis | immigration-mail | immigration-mail | document-action | blueprint | — | — | 8100 | TBD | TBD | needed | planned | Build in canonical repo |
| uscis-rfe-response | USCIS RFE Response | immigration-mail | immigration-mail | document-action | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| transunion-dispute | TransUnion Dispute | dispute-mail | dispute-mail | dispute | functional | ✅ | ✅ | 12100 | TBD | TBD | needed | functional | Migrate code to canonical repo |
| experian-dispute | Experian Dispute | dispute-mail | dispute-mail | dispute | functional | ✅ | ✅ | 8100 | TBD | TBD | needed | functional | Migrate code to canonical repo |
| equifax-dispute | Equifax Dispute | dispute-mail | dispute-mail | dispute | functional | ✅ | ✅ | 6600 | TBD | TBD | needed | functional | Migrate code to canonical repo |
| credit-report-dispute | Credit Report Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | 6600 | TBD | TBD | needed | planned | Build in canonical repo |
| lexisnexis-dispute | LexisNexis Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | 1900 | TBD | TBD | needed | planned | Build in canonical repo |
| hard-inquiry-dispute | Hard Inquiry Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | 880 | TBD | TBD | needed | planned | Build in canonical repo |
| collection-dispute | Collection Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | 1300 | TBD | TBD | needed | planned | Build in canonical repo |
| fcra-dispute | FCRA Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| debt-collection-dispute | Debt Collection Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | 1300 | TBD | TBD | needed | planned | Build in canonical repo |
| debt-validation | Debt Validation Letter | dispute-mail | dispute-mail | dispute | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| fdcpa-dispute | FDCPA Dispute | dispute-mail | dispute-mail | dispute | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| debt-lawsuit-response | Debt Lawsuit Response | dispute-mail | dispute-mail | dispute | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| collection-cease-contact | Collection Cease Contact Letter | dispute-mail | dispute-mail | dispute | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| insurance-claim-denied | Insurance Claim Denied | appeal-mail | appeal-mail | appeal | blueprint | — | — | 1300 | 47 | TBD | needed | planned | Build in canonical repo |
| insurance-claim-appeal | Insurance Claim Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | 260 | 34 | TBD | needed | planned | Build in canonical repo |
| health-insurance-denial | Health Insurance Denial Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| roof-claim-denied | Roof Insurance Claim Denied | appeal-mail | appeal-mail | appeal | blueprint | — | — | 320 | TBD | TBD | needed | planned | Build in canonical repo |
| workers-comp-denied | Workers Compensation Denied | appeal-mail | appeal-mail | appeal | blueprint | — | — | 210 | 45 | TBD | needed | planned | Build in canonical repo |
| life-insurance-claim-denied | Life Insurance Claim Denied | appeal-mail | appeal-mail | appeal | blueprint | — | — | 210 | 18 | TBD | needed | planned | Build in canonical repo |
| financial-aid-appeal | Financial Aid Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | 1000 | TBD | TBD | needed | planned | Build in canonical repo |
| sap-appeal | SAP Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | 390 | TBD | TBD | needed | planned | Build in canonical repo |
| ssdi-appeal | SSDI Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | 260 | TBD | TBD | needed | planned | Build in canonical repo |
| ssi-appeal | SSI Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | 210 | TBD | TBD | needed | planned | Build in canonical repo |
| unemployment-appeal | Unemployment Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| medicaid-appeal | Medicaid Appeal | appeal-mail | appeal-mail | appeal | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| police-records-request | Police Records Request | records-requests | records-requests | records | blueprint | — | — | 1600 | TBD | TBD | needed | planned | Build in canonical repo |
| police-report-request | Police Report Request | records-requests | records-requests | records | blueprint | — | — | 6600 | TBD | TBD | needed | planned | Build in canonical repo |
| public-records-request | Public Records Request | records-requests | records-requests | records | blueprint | — | — | 3600 | TBD | TBD | needed | planned | Build in canonical repo |
| open-records-request | Open Records Request | records-requests | records-requests | records | blueprint | — | — | 1900 | TBD | TBD | needed | planned | Build in canonical repo |
| foia-request | FOIA Request | records-requests | records-requests | records | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| court-records-request | Court Records Request | records-requests | records-requests | records | blueprint | — | — | 1900 | TBD | TBD | needed | planned | Build in canonical repo |
| arrest-records-request | Arrest Records Request | records-requests | records-requests | records | blueprint | — | — | 1600 | TBD | TBD | needed | planned | Build in canonical repo |
| birth-records-request | Birth Records Request | records-requests | records-requests | records | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| marriage-records-request | Marriage Records Request | records-requests | records-requests | records | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| property-records-request | Property Records Request | records-requests | records-requests | records | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| permit-records-request | Permit Records Request | records-requests | records-requests | records | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |
| code-enforcement-notice | Respond to a Code Enforcement Notice | code-enforcement | code-enforcement | jurisdictional | blueprint | — | — | TBD | TBD | TBD | needed | scaffolded | Build in canonical repo |
| tenant-notice-response | Respond to a Tenant Notice | tenant-reply | tenant-reply | jurisdictional | blueprint | — | — | TBD | TBD | TBD | needed | planned | Build in canonical repo |

---

## Summary

**Total workflows:** 48

### By Vertical
- dispute-mail: 13
- appeal-mail: 12
- records-requests: 11
- notice-respond: 7
- immigration-mail: 3
- code-enforcement: 1
- tenant-reply: 1

### By Maturity
- blueprint: 38
- functional: 9
- authority: 1

### By Engine
- appeal: 13
- dispute: 13
- records: 11
- document-action: 9
- jurisdictional: 2

### Keyword Research Status
- All 48 workflows require keyword research (MSV, CPC, competition)
- Values shown are from the original registry and have NOT been verified through Keyword.com
- All CPC and competition values are TBD unless explicitly noted

### Production-Connected Workflows (10)
These have routes, catalog entries, and working code:

1. **cp14-response** (authority, document-action) — full gold-standard pipeline
2. **cp2000-response** (gold, document-action) — full intelligence pipeline + consequential enforcement
3. **cp504-response** (functional, document-action) — full intelligence pipeline
4. **irs-notice** (functional, document-action) — extraction + validation
5. **court-summons** (functional, document-action) — basic
6. **agency-action** (functional, document-action) — basic
7. **file-appeal** (functional, appeal) — basic, ownership ambiguous
8. **transunion-dispute** (functional, dispute) — extraction + security + mailing
9. **experian-dispute** (functional, dispute) — shared extraction
10. **equifax-dispute** (functional, dispute) — shared extraction

### Blueprint-Only Workflows (38)
These have registry entries but no code, no routes, no tests:
- 10 dispute-mail blueprints
- 12 appeal-mail blueprints
- 11 records-requests blueprints
- 3 immigration-mail blueprints
- 1 code-enforcement blueprint
- 1 tenant-reply blueprint
