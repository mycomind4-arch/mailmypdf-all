# MailMyPDF Unified Architecture Plan

## Overview
Single website consolidating 13 legal/administrative workflow verticals into one discoverable platform.

## 13 Workflow Categories

### 1. Appeal Mail
- Insurance coverage denials
- Benefits appeals (unemployment, disability)
- Financial aid reinstatement
- Domain: case management, evidence gathering, appeal letter generation

### 2. Benefits Appeal
- Unemployment benefits
- Disability benefits
- Student loan appeals
- Domain: application tracking, evidence documentation

### 3. Claim Proof
- Insurance claims documentation
- Evidence collection
- Claim assembly
- Domain: document verification, evidence validation

### 4. Code Enforcement
- Housing code violations
- Municipal citations
- Remediation tracking
- Domain: violation analysis, response strategy

### 5. Dispute Mail
- Credit disputes
- Debt validation
- Inaccuracy claims
- Domain: dispute letter automation, regulation compliance

### 6. Immigration Mail
- Biometric appointments
- I-864 affidavit
- RFE responses
- Form I-130 tracking
- Domain: USCIS process automation

### 7. Insurance Claims
- Claim filing
- Denial appeals
- Underwriting responses
- Domain: claims documentation, appeal strategy

### 8. Notice Respond
- IRS CP2000 notices
- Tax notices
- Audit responses
- Domain: tax notice analysis, audit response

### 9. Permit Reply
- Permit denials
- Variance requests
- Variance responses
- Domain: permit process automation

### 10. Private Office
- Capability tracking
- Workflow orchestration
- Internal operations
- Domain: business process automation

### 11. Records Request
- Public records requests
- FOIA/CCPA requests
- Response tracking
- Domain: request automation, tracking

### 12. Small Business
- Business document generation
- Operations management
- Domain: business template automation

### 13. Tenant Reply
- Eviction responses
- Repair demands
- Tenant rights documentation
- Domain: tenant advocacy

## Unified Architecture

### Frontend Structure
```
apps/mailmypdf/src/
  /routes
    /workflows/          # Hub and category landing pages
      /index.tsx         # Workflow hub (discovery)
      /$category/        # Category pages (e.g., /appeals, /requests)
      /$workflowId/      # Individual workflow pages
    /api/workflows/      # Workflow execution APIs
  /components
    /workflow-hub/       # Hub UI components
    /seo/                # Metadata components
    /shared/             # Shared UI (nav, footer, etc.)
  /domain/workflows/     # Workflow domain logic (shared)
  /lib/
    /workflows/          # Workflow utilities
    /seo/                # SEO utilities
    /discovery/          # Workflow discovery/search
```

### SEO Architecture
1. **Workflow Hub** (`/workflows`) - Central discovery point
2. **Category Pages** (`/workflows/appeals`, `/workflows/requests`, etc.)
3. **Individual Workflows** - One page per workflow with:
   - SEO title & description
   - Structured data (Schema.org)
   - Open Graph meta tags
   - Canonical URLs
   - Meta robots directives

4. **Blog/Content** (`/guides`, `/blog`) for:
   - Workflow guides
   - Legal updates
   - Process documentation
   - Long-tail SEO targets

5. **Sitemap & Robots.txt**
   - Dynamic sitemap generation
   - Priority tiers for discovery

### Workflow Categories for Navigation
```
Appeals (4 workflows):
  - Insurance Appeals
  - Benefits Appeals
  - Immigration Appeals
  - Tax Appeals

Requests (2 workflows):
  - Public Records Requests
  - FOIA/CCPA Requests

Claims (2 workflows):
  - Insurance Claims
  - Claim Evidence

Disputes (1 workflow):
  - Debt/Credit Disputes

Permits & Code (2 workflows):
  - Permit Responses
  - Code Enforcement

Tenant (1 workflow):
  - Tenant Rights/Eviction

Litigation (1 workflow):
  - Case Management
```

## Implementation Phases

### Phase 1: Code Consolidation (CURRENT)
- [x] Audit all 13 verticals
- [ ] Merge missing GitHub code into local
- [ ] Consolidate shared domain logic
- [ ] Unified auth & entitlements

### Phase 2: Workflow Hub
- [ ] Build central discovery page
- [ ] Create category landing pages
- [ ] Implement workflow card UI
- [ ] Add search/filter functionality

### Phase 3: SEO Optimization
- [ ] Implement metadata generation
- [ ] Add structured data (Schema.org)
- [ ] Create blog content structure
- [ ] Build dynamic sitemap
- [ ] Optimize URLs and canonicals

### Phase 4: Admin & Management
- [ ] Workflow admin dashboard
- [ ] Category management
- [ ] Content/metadata editing
- [ ] Analytics integration

### Phase 5: Deployment & Cleanup
- [ ] Remove old GitHub repos
- [ ] Deploy unified site
- [ ] Redirect old URLs
- [ ] Monitor & optimize

## Key Technologies
- Frontend: React/TanStack Start
- Database: Supabase
- SEO: React Head, Schema.org, Dynamic sitemaps
- Admin: React + form builders
- Hosting: Cloudflare/Vercel
