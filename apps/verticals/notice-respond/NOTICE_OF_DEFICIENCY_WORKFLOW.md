# Notice of Deficiency (90-Day Letter) Response Workflow

## Overview

Production-grade workflow for helping taxpayers respond to IRS Notice of Deficiency (90-day letter), incorporating:

- **Multi-LLM extraction** with Claude primary, Gemini/OpenAI fallback
- **Critical deadline management** (90/150-day statutory response period)
- **Tax Court petition support** with jurisdiction protection
- **8-path intelligent routing** to optimal response strategy
- **7-document generation** for various response scenarios
- **Comprehensive guardrails** with fraud detection and deadline alerts

## Critical Timeline

The Notice of Deficiency initiates a **90-day period** (150 days for overseas taxpayers) to respond. This is a hard statutory deadline with severe consequences for missing it.

**Key Dates:**
- Notice Date: Date IRS sends the notice
- Response Deadline: 90 days from notice date (or 150 if outside US)
- Tax Court Petition Deadline: Same as response deadline
- Appeals Deadline: Varies by situation

**Missing the deadline forecloses:**
- Tax Court petition filing rights
- Administrative appeal options  
- Ability to contest the deficiency
- May trigger assessment and collection

## Architecture

### Core Modules

#### 1. **Type System** (`src/domain/workflows/notice-of-deficiency/types.ts`)

Defines complete data structures:

- `TaxAdjustmentLine` - Individual tax adjustments by form line
- `DeficiencyCalculation` - Tax calculation summary
- `NoticeOfDeficiencyExtraction` - All notice fields with confidence scores
- `DeficiencyIntakeConfirmation` - User-confirmed extraction data
- `DeficiencyClassificationResult` - Routing with strategy and critical warnings
- `GeneratedDocument` - 7 document types
- `DeficiencyWorkflowState` - Complete state machine
- `DeficiencyReferenceData` - Statutory deadline references

**Confidence Thresholds:**
- Notice Date: 0.95+ (critical for deadline)
- Deficiency Amount: 0.95+ (critical for assessment)
- Tax Year: 0.98+ (must be accurate)
- Statutory Deadline: 0.98+ (critical for jurisdiction)
- Fraud Indicators: 0.95+ (critical safety gate)

#### 2. **Extraction Service** (`src/domain/workflows/notice-of-deficiency/extraction.ts`)

Multi-LLM extraction with validation:

- `extractDeficiencyNotice()` - Main extraction function
- `validateNoticeDate()` - Ensures reasonable date range
- `validateTaxYear()` - Checks year is past and not too old
- `validateTaxAdjustmentLines()` - Validates math on adjustments
- `validateDeficiencyMath()` - Verifies original + adjustment = result
- Automatic deadline calculation (90 or 150 days)

#### 3. **Classification Engine** (`src/domain/workflows/notice-of-deficiency/classification.ts`)

Routes through 8 response paths:

**Response Paths:**
1. `agree` - Taxpayer agrees with deficiency
2. `disagree-and-petition` - Disputes with appeals option
3. `tax-court-petition` - Elects Tax Court jurisdiction
4. `payment-plan` - Requests installment agreement
5. `settlement` - Proposes compromise settlement
6. `collection-alternative` - Requests hardship relief
7. `innocent-spouse` - Claims innocent spouse relief
8. `escalate-attorney` - Professional representation needed

**Hard-Stop Conditions:**
- Deadline passed → Attorney escalation
- Fraud allegations → Attorney escalation
- Substantial amount ($100K+) → Attorney escalation

#### 4. **Document Generation** (`src/domain/workflows/notice-of-deficiency/document-generation.ts`)

Generates 7 document types:

1. **Agreement Letter** - Agree with deficiency
2. **Disagreement Letter** - Dispute adjustments
3. **Tax Court Petition** - File with Tax Court
4. **Payment Plan Request** - Installment agreement
5. **Settlement Proposal** - Settlement offer
6. **Innocent Spouse Claim** - IRC § 6015 relief claim
7. **Attorney Referral** - Professional guidance document

All include legal disclaimers and statutory references.

#### 5. **Guardrails & Compliance** (`src/domain/workflows/notice-of-deficiency/guardrails.ts`)

Enforces critical requirements:

**Six Core Guardrails:**

1. **Critical Deadline** - 90/150-day response period alert
2. **Tax Court Jurisdiction** - Petition deadline protection
3. **No Fabricated Defenses** - Evidence-based positions only
4. **Attorney Escalation** - Complex/high-risk case routing
5. **Fraud Detection** - Fraud allegation warnings
6. **Assumption Flagging** - Low-confidence extraction alerts

**Compliance Checks:**
- Pre-classification verification
- Pre-sending validation
- Critical deadline warnings
- Fraud risk assessment (0-1)
- Statute/authority verification

### API Endpoints

#### `POST /api/workflows/notice-of-deficiency/extract`

```json
{
  "noticeText": "full notice text",
  "provider": "claude"
}
```

Response includes:
- `notice_date` with confidence
- `deficiency_amount` with confidence  
- `tax_year` with 0.98+ confidence
- `statutory_notice_deadline` (calculated)
- `tax_adjustment_lines` (line-by-line)
- `fraud_indicators` (critical field)

#### `POST /api/workflows/notice-of-deficiency/classify`

```json
{
  "intake": { /* extraction */ },
  "taxpayer_agrees": false,
  "has_evidence": true,
  "deficiency_amount": 25000,
  "can_pay_full": false,
  "wants_tax_court": true,
  "is_joint_return": false,
  "hardship_situation": false,
  "has_fraud_allegations": false
}
```

Response:
- `path` - One of 8 routing paths
- `confidence` - 0.70-0.95
- `hard_stop` - Boolean flag
- `critical_warnings` - Deadline/fraud alerts
- `tax_court_filing_deadline_days` - Countdown

#### `POST /api/workflows/notice-of-deficiency/generate-document`

```json
{
  "type": "disagreement-response",
  "intake": { /* extraction */ },
  "payload": {
    "taxpayer_explanation": "...",
    "evidence_references": ["..."],
    "disputed_lines": ["..."],
    "legal_authority_citations": ["IRC § 162(a)"]
  }
}
```

## Usage Flow

```
User uploads Notice of Deficiency
    ↓
LLM extracts: notice_date, deficiency, tax_year, deadline, fraud indicators
    ↓
User confirms extraction accuracy
    ↓
User answers situation questions (agree? evidence? Tax Court?)
    ↓
Classification routes to 8-path response strategy
    ↓
Hard-stop check: deadline passed? fraud? substantial amount?
    ↓
If hard-stop triggered → Attorney escalation document
    ↓
Else → Generate selected response documents
    ↓
User reviews and signs documents
    ↓
User mails/e-files response before statutory deadline
    ↓
Follow-up tracking (monitor for assessment/collection)
```

## Compliance & Legal

### IRS Statutory References

- **IRC § 6213** - Restrictions on assessments (90-day letter requirements)
- **IRC § 6213(a)** - 90-day response period (domestic)
- **IRC § 6213(d)** - 150-day period (outside US)
- **IRC § 6015** - Innocent spouse relief (alternative to deficiency liability)
- **IRC § 6320/6330** - Collection Due Process (if levy notice follows)
- **Tax Court Rules** - Petition requirements and procedures
- **Treasury Reg. § 601.105** - Appeals procedures

### Critical Requirements

1. **Deadline is Absolute** - IRC § 6213 statutory period cannot be extended
2. **Tax Court has 90-day rule** - Petition must be filed within deadline
3. **Written Response Needed** - No verbal responses accepted
4. **Signature Required** - Many documents require taxpayer signature
5. **No Admission** - Disagreement does not admit facts

### Disclaimers

All documents include:
- "This is not legal advice"
- "Consult a tax professional before submitting"
- "This tool is not a substitute for representation"
- "Notice Respond is not a law firm"

### Assumption Flagging

Low-confidence extractions flagged:
```
[ASSUMPTION] Deadline confidence is 88%. Verify: 2026-12-02
[ASSUMPTION] Deficiency confidence is 82%. Verify: $47,500
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
- 0.98+ = Certain (deadline, tax year)
- 0.95+ = High (notice date, deficiency)
- 0.85+ = Good (adjustments, contact info)
- 0.75-0.85 = Possible (requires confirmation)
- <0.75 = Uncertain (requires user input)

## Testing Scenarios

1. **Simple Agreement** - Taxpayer agrees, full payment capability
2. **Disagreement with Evidence** - Disputes specific adjustments
3. **Tax Court Petition** - Files petition to preserve rights
4. **Payment Plan Request** - Unable to pay in full
5. **Settlement Proposal** - Offers compromise amount
6. **Innocent Spouse Claim** - Joint return, claims relief
7. **Deadline Passed** - Hard-stop, attorney escalation
8. **Fraud Allegations** - Hard-stop, attorney escalation

## Key Differences from Other Workflows

**vs. CP2000 (Notice of Proposed Adjustment):**
- 90-day deadline is absolute (90+ day is informal)
- Tax Court petition rights only with deficiency notice
- More formal/consequential nature
- Likely already examined (deficiency comes after)

**vs. Eviction Notice:**
- Federal statutory procedure
- Independent court jurisdiction (Tax Court)
- Settlement/payment plan negotiation emphasis
- Fraud and criminal implications possible

## Future Enhancements

1. **Tax Court e-filing** - Integrated Tax Court petition filing
2. **Form 870 Preparation** - Automated Form 870-AD (Agreement)
3. **Amended Return Analysis** - Alternative response via Form 1040-X
4. **Reasonable Cause Documentation** - Late filing justification
5. **Collection Due Process** - Follow-up CDP notice handling
6. **Offer in Compromise** - Evaluate OIC feasibility
7. **Multi-year Notices** - Handle notices covering multiple years
8. **Estate/Fiduciary Cases** - Support estates, trusts, partnerships
9. **Prior Case History** - Reference prior examination findings
10. **International Taxation** - Support foreign income/tax treaty claims

## Files

```
apps/verticals/notice-respond/
├── src/
│   ├── components/
│   │   └── notice-of-deficiency-workflow.tsx (UI - future)
│   └── domain/
│       └── workflows/
│           └── notice-of-deficiency/
│               ├── types.ts (type definitions)
│               ├── extraction.ts (LLM extraction)
│               ├── classification.ts (routing logic)
│               ├── document-generation.ts (7 document types)
│               └── guardrails.ts (compliance checks)
├── server/
│   └── api/
│       └── workflows/
│           └── notice-of-deficiency/
│               ├── extract.ts (extraction endpoint)
│               ├── classify.ts (classification endpoint)
│               └── generate-document.ts (document generation endpoint)
└── NOTICE_OF_DEFICIENCY_WORKFLOW.md (this file)
```

## License & Attribution

© 2026 MailMyPDF. All rights reserved.

This workflow is part of the Notice Respond vertical and adheres to all applicable IRS procedures and Tax Court rules.
