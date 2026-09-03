# Collection Due Process (CDP) Notice Response Workflow

## Overview

Production-grade workflow for helping taxpayers respond to IRS Collection Due Process (CDP) notices and prevent levy action, incorporating:

- **Multi-LLM extraction** with Claude primary, Gemini/OpenAI fallback
- **Levy threat assessment** (wage, bank, property levies)
- **Critical deadline management** (30-day CDP response period)
- **8-path intelligent routing** to optimal levy prevention strategy
- **8-document generation** for various levy prevention scenarios
- **Comprehensive guardrails** with bankruptcy detection and levy risk assessment

## Critical Timeline

The Collection Due Process notice (CP90 or NFTL) initiates a **30-day period** to respond before levy action commences. This is a hard statutory deadline with severe consequences for missing it.

**Key Dates:**
- Notice Date: Date IRS sends the notice
- Response Deadline: 30 days from notice date
- Levy Action Commencement: Immediately after deadline if no response
- Wage Levy Impact: Affects current and future paychecks
- Bank Levy Impact: Freezes bank accounts and removes funds
- Property Levy Impact: IRS can seize real property and assets

**Missing the deadline forecloses:**
- Right to CDP hearing (administrative appeal)
- Ability to propose alternatives before levy
- Negotiating leverage with IRS
- Immediate levy action with minimal notice

## Architecture

### Core Modules

#### 1. **Type System** (`src/domain/workflows/collection-due-process/types.ts`)

Defines complete data structures (283 lines):

- `TaxDebtItem` - Individual tax assessments by year and type
- `LevyThreats` - Specific levy threats (wage, bank, property)
- `CDPNoticeExtraction` - All notice fields with confidence scores
- `CDPIntakeConfirmation` - User-confirmed extraction data
- `CDPClassificationResult` - Routing with strategy and levy prevention
- `GeneratedDocument` - 8 document types
- `CDPWorkflowState` - Complete state machine
- `CDPReferenceData` - Statutory deadline references

**Confidence Thresholds:**
- Notice Date: 0.95+ (critical for deadline)
- Response Deadline: 0.98+ (critical - determines urgency)
- Total Tax Debt: 0.95+ (critical for assessment)
- Levy Threats: 0.95+ (critical for strategy selection)
- Notice Type: 0.90+ (CDP vs NFTL determines available options)

#### 2. **Extraction Service** (`src/domain/workflows/collection-due-process/extraction.ts`)

Multi-LLM extraction with validation (319 lines):

- `extractCDPNotice()` - Main extraction function with multi-LLM fallback
- `validateNoticeDate()` - Ensures recent notice (within 180 days)
- `validateResponseDeadline()` - Checks deadline is 30 days from notice
- `validateTaxDebtItems()` - Validates individual debt items
- `assessLevyRisk()` - Calculates levy threat level (imminent/likely/possible)
- `estimateLevyTimeline()` - Estimates days until actual levy action

#### 3. **Classification Engine** (`src/domain/workflows/collection-due-process/classification.ts`)

Routes through 8 levy prevention paths (423 lines):

**Response Paths:**
1. `setup-payment-plan` - Installment agreement (suspends levy)
2. `request-currently-not-collectible` - CNC status (suspends for 12-24 months)
3. `request-offer-in-compromise` - Settle for less than owed
4. `dispute-liability` - Challenge underlying tax assessment
5. `request-lien-withdrawal` - Remove NFTL from public records
6. `levy-hardship-relief` - Alternative to levy based on hardship
7. `bankruptcy-protection` - Automatic stay halts levy immediately
8. `escalate-attorney` - Professional representation needed

**Hard-Stop Conditions:**
- Deadline passed → Attorney escalation (levy imminent)
- Bankruptcy automatic stay → Immediate protection
- Specific assets named → Critical hardship/bankruptcy consideration

#### 4. **Document Generation** (`src/domain/workflows/collection-due-process/document-generation.ts`)

Generates 8 document types (650+ lines):

1. **Payment Plan Proposal** - Monthly payment arrangement proposal
2. **Currently Not Collectible Request** - Hardship-based suspension
3. **Offer in Compromise** - Settlement for reduced amount
4. **Liability Dispute** - Challenge to underlying assessment
5. **Lien Withdrawal Request** - NFTL removal request
6. **Levy Hardship Relief** - Economic hardship alternative
7. **Bankruptcy Notice** - Automatic stay notification
8. **Attorney Referral** - Professional escalation guidance

All include legal disclaimers and statutory references.

#### 5. **Guardrails & Compliance** (`src/domain/workflows/collection-due-process/guardrails.ts`)

Enforces critical requirements (380 lines):

**Six Core Guardrails:**

1. **Critical Deadline** - 30-day response period alert
2. **Levy Prevention** - Alternatives available for situation
3. **Bankruptcy Automatic Stay** - Automatic stay effects
4. **No Fabricated Claims** - Evidence-based positions only
5. **Attorney Escalation** - Complex/high-risk case routing
6. **Assumption Flagging** - Low-confidence extraction alerts

**Compliance Checks:**
- Pre-classification verification
- Pre-sending validation
- Critical deadline warnings
- Levy risk assessment (0-1 scale)
- Specific deadline tracking

### API Endpoints

#### `POST /api/workflows/collection-due-process/extract`

```json
{
  "noticeText": "full notice text",
  "provider": "claude"
}
```

Response includes:
- `notice_date` with confidence
- `notice_type` (CDP or NFTL)
- `response_deadline` (calculated)
- `total_tax_debt` with confidence
- `levy_threats` (wage/bank/property)
- `tax_debt_items` (line-by-line)
- All fields with confidence scores

#### `POST /api/workflows/collection-due-process/classify`

```json
{
  "intake": { /* extraction */ },
  "can_pay_full": false,
  "can_pay_partial": true,
  "payment_capability": 1500,
  "financial_hardship": false,
  "disputes_liability": false,
  "has_prior_cdp": false,
  "in_bankruptcy": false,
  "has_valid_defense": false
}
```

Response:
- `path` - One of 8 routing paths
- `confidence` - 0.70-0.95
- `hard_stop` - Boolean flag
- `critical_warnings` - Deadline/levy alerts
- `levy_threat_level` - imminent/likely/possible
- `estimated_levy_timeline` - countdown to levy

#### `POST /api/workflows/collection-due-process/generate-document`

```json
{
  "type": "payment-plan-proposal",
  "intake": { /* extraction */ },
  "payload": {
    "monthly_payment": 1500,
    "duration_months": 60,
    "first_payment_date": "2026-10-15",
    "payment_method": "eft"
  }
}
```

## Usage Flow

```
User uploads CDP Notice or Levy Notice
    ↓
LLM extracts: notice_date, deadline, tax_debt, levy_threats
    ↓
User confirms extraction accuracy
    ↓
User answers situation questions (can pay? hardship? bankruptcy?)
    ↓
Classification routes to 8-path levy prevention strategy
    ↓
Hard-stop check: deadline passed? bankruptcy automatic stay?
    ↓
If hard-stop triggered → Attorney escalation document
    ↓
Else → Generate selected levy prevention document
    ↓
User reviews and signs document
    ↓
User mails/e-files response before 30-day deadline
    ↓
Follow-up tracking (monitor for levy action)
```

## Compliance & Legal

### IRS Statutory References

- **IRC § 6330** - Collection Due Process rights and procedures
- **IRC § 6320** - Notice of Federal Tax Lien (NFTL) CDP rights
- **IRC § 6325** - Federal tax lien withdrawal provisions
- **IRC § 6331** - Levy procedures and timing
- **IRC § 6362** - Automatic stay in bankruptcy
- **IRC § 6503(b)** - Suspension of collection during CDP
- **IRS Manual § 5.8** - Collection procedures and alternatives
- **Treasury Reg. § 301.6330** - CDP procedural regulations

### Critical Requirements

1. **30-Day Deadline is Absolute** - IRC § 6330 statutory period cannot be extended
2. **Written Response Needed** - Verbal responses are not accepted
3. **Signature May Be Required** - Many strategies require taxpayer signature
4. **Wage Levy Exemptions** - Standard deduction amount is exempt
5. **Bank Levy Procedure** - 21-day notice required before levy
6. **Property Levy** - Must follow specific procedure under IRC § 6331

### Levy Prevention Strategies

1. **Installment Agreement** - Monthly payment plan stops levy
2. **Currently Not Collectible** - Suspends collection 12-24 months
3. **Offer in Compromise** - Settle for negotiated amount
4. **Lien Withdrawal** - Removes NFTL from public records
5. **Liability Dispute** - Halts collection pending Appeals review
6. **Hardship Relief** - Alternative to levy based on financial hardship
7. **Bankruptcy** - Automatic stay immediately halts all collection
8. **Attorney Representation** - Professional negotiation with IRS

### Disclaimers

All documents include:
- "This is not legal advice"
- "Consult a tax professional before submitting"
- "This tool is not a substitute for representation"
- "Notice Respond is not a law firm"

### Assumption Flagging

Low-confidence extractions flagged:
```
[ASSUMPTION] Deadline confidence is 88%. Verify: 2026-09-30
[ASSUMPTION] Levy confidence is 82%. Verify manually.
```

## Performance & Scalability

### Token Usage

- Extraction: 2,500-4,000 tokens
- Classification: 1,000 tokens
- Document generation: 3,000-5,000 tokens per document
- Total workflow: 10,000-15,000 tokens

### Multi-LLM Strategy

- Claude: Primary (best at tax law and complex analysis)
- Gemini: Secondary fallback (fast extraction)
- OpenAI: Tertiary fallback (reliable backup)

### Confidence Scoring

Each field scored 0-1:
- 0.98+ = Certain (deadline, notice date)
- 0.95+ = High (debt amount, levy threats)
- 0.85+ = Good (details, contact info)
- 0.75-0.85 = Possible (requires confirmation)
- <0.75 = Uncertain (requires user input)

## Testing Scenarios

1. **Full Payment Capability** - Taxpayer can pay immediately
2. **Partial Payment Plan** - Monthly installment arrangement
3. **Currently Not Collectible** - Financial hardship suspension
4. **Offer in Compromise** - Settle for less than owed
5. **Liability Dispute** - Challenge underlying assessment
6. **Lien Withdrawal** - Remove NFTL from records
7. **Bankruptcy Protection** - Automatic stay filing
8. **Deadline Passed** - Hard-stop, attorney escalation
9. **Wage Levy Threat** - Specific asset identified
10. **Multiple Levy Threats** - Comprehensive strategy needed

## Key Differences from Other Workflows

**vs. Notice of Deficiency (90-day letter):**
- 30-day deadline (faster, more urgent)
- Focus on levy prevention vs. liability dispute
- Collection procedures vs. appeals procedures
- Multiple alternative payment strategies
- Bankruptcy automatic stay is primary defense

**vs. CP2000 (Notice of Proposed Adjustment):**
- CP2000 is examination response (informal 60-day)
- CDP is collection notice (formal 30-day)
- CDP has automatic stay bankruptcy option
- CDP focuses on payment alternatives, not disagreement
- CDP involves actual levy threat, not proposed adjustment

**vs. Wage Garnishment/Eviction:**
- Federal statutory procedure (uniformly applies)
- 30-day deadline with alternatives
- Multiple payment/settlement options
- Bankruptcy automatic stay available
- Professional IRS negotiation possible

## Future Enhancements

1. **Real-time Levy Tracking** - Monitor levy progress
2. **Automated Payment Plan Calculators** - Calculate affordable payments
3. **Lien Search Integration** - Check lien status
4. **Bankruptcy Pre-Screening** - Evaluate bankruptcy viability
5. **Multi-Document Bundle** - Generate multiple documents together
6. **IRS Portal Integration** - Direct submission to IRS
7. **Professional Referral** - Connect with tax attorneys/CPAs
8. **Appeal Tracking** - Monitor Appeals decisions
9. **Collection Status Updates** - Real-time IRS status
10. **Hardship Documentation** - Guided financial form preparation

## Files

```
apps/verticals/notice-respond/
├── src/
│   ├── components/
│   │   └── collection-due-process-workflow.tsx (UI - future)
│   └── domain/
│       └── workflows/
│           └── collection-due-process/
│               ├── types.ts (type definitions)
│               ├── extraction.ts (LLM extraction)
│               ├── classification.ts (routing logic)
│               ├── document-generation.ts (8 document types)
│               └── guardrails.ts (compliance checks)
├── server/
│   └── api/
│       └── workflows/
│           └── collection-due-process/
│               ├── extract.ts (extraction endpoint)
│               ├── classify.ts (classification endpoint)
│               └── generate-document.ts (document generation endpoint)
└── COLLECTION_DUE_PROCESS_WORKFLOW.md (this file)
```

## License & Attribution

© 2026 MailMyPDF. All rights reserved.

This workflow is part of the Notice Respond vertical and adheres to all applicable IRS procedures and Collection Due Process requirements.

---

## Quick Reference: Levy Prevention Strategies

| Strategy | Timeline | Eligibility | Effect | Cost |
|----------|----------|-------------|--------|------|
| Payment Plan | 5-20 days | Anyone can pay partially | Stops levy, monthly payments | None |
| Currently Not Collectible | 30-60 days | Financial hardship only | Suspends 12-24 months | None |
| Offer in Compromise | 120-180 days | Doubt of collectibility | Settles for reduced amount | $225 fee |
| Liability Dispute | 45-90 days | Disputes underlying tax | Halts collection for review | None |
| Lien Withdrawal | 60-90 days | NFTL only, with payment plan | Removes from public records | None |
| Bankruptcy | Hours | Any situation | Automatic stay immediately | $300-3000+ attorney |
| Hardship Relief | 30-60 days | Severe financial hardship | Alternative to levy | None |
| Attorney Representation | Negotiable | All situations | Professional negotiation | $2000-10000+ |
