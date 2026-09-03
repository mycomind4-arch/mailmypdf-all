# CP2000 IRS Notice Response Workflow

## Overview

This is a production-grade workflow for helping taxpayers respond to IRS Notice of Proposed Adjustment (CP2000 and related notices). It incorporates:

- **Multi-LLM extraction** with Claude, Gemini, and OpenAI fallback
- **Intelligent classification** with hard-stop safety gates for complex situations
- **Legal document generation** with statutory compliance and tax law references
- **Comprehensive guardrails** ensuring safety, accuracy, and professional standards

## Architecture

### Core Modules

#### 1. **Type System** (`src/domain/workflows/cp2000/types.ts`)

Defines all data structures:

- `ProposedAdjustment` - Individual line-by-line tax adjustments
- `CP2000NoticeExtraction` - Extracted notice fields with confidence scores
- `CP2000IntakeConfirmation` - User-confirmed extraction data
- `CP2000ClassificationResult` - Routing decision and strategy recommendation
- `GeneratedDocument` - Generated response letters and forms
- `EvictionWorkflowState` - Complete workflow state machine

**Key Confidence Thresholds:**
- Deadline: 0.90+ (critical - deadline has legal implications)
- Tax Year: 0.95+ (critical - must be accurate)
- Notice Number: 0.85+ (important for IRS tracking)
- Proposed Adjustments: 0.85+ (critical - substantive tax positions)
- Fraud Indicators: 0.90+ (critical - legal implications)

#### 2. **Extraction Service** (`src/domain/workflows/cp2000/extraction.ts`)

- Calls `/api/extract` endpoint with notice text
- Normalizes LLM output to structured CP2000NoticeExtraction schema
- Provides confidence scoring for each field
- Validates extraction results
- Functions:
  - `extractCP2000Notice()` - Main extraction function
  - `validateDeadlineExtraction()` - Checks deadline validity (30 vs 60 days)
  - `validateTaxYearExtraction()` - Checks tax year is valid past year
  - `validateProposedAdjustmentsExtraction()` - Validates each line item math
  - `validateContactInfoExtraction()` - Checks IRS contact information

#### 3. **Classification Engine** (`src/domain/workflows/cp2000/classification.ts`)

Routes taxpayer through appropriate response path:

**Response Paths:**
- `agree` - Taxpayer agrees with all proposed adjustments and will pay
- `disagree` - Taxpayer disputes adjustments with supporting evidence
- `partial` - Taxpayer agrees with some items, disputes others
- `appeal` - Taxpayer requests independent Office of Appeals review
- `extension` - Taxpayer requests additional time to respond
- `escalate-attorney` - Complex or high-risk situation requiring professional representation

**Hard-Stop Conditions:**
1. **Deadline has passed** (today >= deadline_date) - Mandatory attorney escalation
2. **Criminal references** - Notice mentions criminal investigation or fraud
3. **Fraud indicators** - Notice language suggests fraud concerns
4. **Complex situation** - IRS designation of complex examination
5. **Criminal record** - User has criminal history relevant to case

#### 4. **Document Generation** (`src/domain/workflows/cp2000/document-generation.ts`)

Generates six types of documents:

**1. Agreement Letter**
- Formal acknowledgment of proposed adjustments
- Payment plan options (full, partial with plan, extension)
- No signature required
- Includes disclaimer

**2. Disagreement Letter**
- Disputes adjustments with legal and factual arguments
- References supporting evidence
- Lists disputed items with taxpayer position
- No signature required
- Includes disclaimer

**3. Partial Agreement Letter**
- Acknowledges agreement on some items
- Disputes others with detailed explanations
- Structured to highlight concessions first (strategic)
- No signature required
- Includes disclaimer

**4. Appeal Request**
- Requests independent Office of Appeals review
- References IRC § 7123 administrative appeal rights
- Formal Statement of Disagreement (SOD)
- No signature required (but attorney review recommended)
- Includes disclaimer

**5. Extension Request**
- Requests additional time to respond
- Specifies reason (gather evidence, consult professional, clarify position)
- References reasonable cause standard
- No signature required
- Includes disclaimer

**6. Attorney Referral**
- Guidance document for complex/high-risk cases
- Lists reasons requiring professional representation
- Resources for finding qualified tax attorneys
- Time-sensitive deadline warnings
- Not submitted to IRS

#### 5. **Guardrails & Compliance** (`src/domain/workflows/cp2000/guardrails.ts`)

Enforces legal and ethical standards:

**Six Core Guardrails:**

1. **No Unsubstantiated Claims** - All tax positions must be evidence-based
2. **No Fraud Accusations** - Do not accuse IRS of fraud without legal grounds
3. **Tax Law Compliance** - All positions reference IRC sections, Treasury Regulations, case law
4. **Professional Escalation** - Complex/high-risk cases routed to attorneys
5. **Assumption Flagging** - Low-confidence extractions flagged for manual review
6. **Statute Verification** - All statute citations verified for current validity

**Compliance Checks:**

- Pre-classification compliance check (after extraction)
- Pre-sending compliance check (before user submits to IRS)
- Assumption flagging for fields below confidence thresholds
- Fraud risk assessment (0-1 scale)
- Statute citation verification

### API Endpoints

#### `POST /api/workflows/cp2000/extract`

**Request:**
```json
{
  "noticeText": "full text of CP2000 notice",
  "provider": "claude" // optional: claude, gemini, openai
}
```

**Response:**
```json
{
  "success": true,
  "extraction": {
    "deadline_date": "2026-10-03",
    "deadline_confidence": 0.95,
    "deadline_days": 30,
    "notice_number": "CP2000",
    "notice_issue_date": "2026-09-03",
    "taxpayer_name": "John Doe",
    "taxpayer_ssn_masked": "###-##-1234",
    "tax_year": 2024,
    "tax_year_confidence": 0.98,
    "proposed_adjustments": [
      {
        "id": "adj-1",
        "category": "Unreported W-2 Income",
        "line_reference": "1040 Line 1",
        "original_amount": 50000,
        "adjustment_amount": 5000,
        "resulting_amount": 55000,
        "confidence": 0.92
      }
    ],
    "total_additional_tax": 1250,
    "proposed_penalty_amount": 250,
    "irs_contact_info": {
      "phone": "1-800-829-1040",
      "fax": null,
      "address": "IRS Campus Address"
    },
    "is_outside_us_flag": false,
    "notice_complexity": "simple",
    "fraud_indicators": []
  },
  "provider": "claude",
  "model": "claude-opus-5"
}
```

#### `POST /api/workflows/cp2000/classify`

**Request:**
```json
{
  "intake": { /* CP2000IntakeConfirmation */ },
  "agree_with_all": false,
  "has_supporting_evidence": true,
  "adjustment_amount": 5000,
  "has_penalties": true,
  "wants_appeal": false,
  "needs_extension": false,
  "prior_audit": false,
  "criminal_record": false
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "path": "disagree",
    "confidence": 0.85,
    "reasoning": "Taxpayer disagrees with $5000 adjustment and has supporting evidence",
    "hard_stop": false,
    "recommended_strategy": "You have supporting evidence for your position. Document all facts and submit with your response.",
    "next_steps": [
      "Prepare detailed explanation of your position",
      "Gather all supporting documentation",
      "Reference applicable tax law or regulation",
      "Draft disagreement response letter",
      "Mail response by deadline with proof of delivery"
    ],
    "risk_level": "low",
    "estimated_irs_response_time": "Review and response: 30-60 days"
  }
}
```

#### `POST /api/workflows/cp2000/generate-document`

**Request:**
```json
{
  "type": "disagreement-letter" | "agreement-letter" | "partial-agreement-letter" | "appeal-request" | "extension-request" | "attorney-referral",
  "intake": { /* CP2000IntakeConfirmation */ },
  "payload": {
    "taxpayer_explanation": "...",
    "evidence_references": ["..."],
    "disputed_items": ["..."]
  }
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "type": "disagreement-letter",
    "title": "Statement of Disagreement to IRS Notice",
    "content": "...",
    "markdown_content": "...",
    "requires_signature": true,
    "is_official_form": false,
    "generated_at": "2026-09-03",
    "model_used": "claude-3.5-sonnet",
    "provider": "claude"
  }
}
```

### UI Component (Future)

Multi-step React workflow component with stages:

1. **Upload** - User uploads notice PDF/image/text
2. **Extraction Review** - LLM extraction with confidence scores
3. **Intake Questions** - Taxpayer answers about situation
4. **Classification Review** - Recommended path and strategy
5. **Document Selection** - Choose which documents to generate
6. **Document Review** - Review generated documents
7. **Signature** - Sign required documents
8. **Mailing** - Choose delivery method
9. **Complete** - Confirmation and next steps

## Usage Flow

### Complete Workflow

```
User uploads notice
    ↓
LLM extracts fields (Claude/Gemini/OpenAI)
    ↓
User confirms extraction details
    ↓
User answers situation questions (agree? evidence? appeals?)
    ↓
Classification engine routes to response path
    ↓
Compliance check (guardrails)
    ↓
Hard-stop conditions checked (deadline, fraud, complexity)
    ↓
User selects documents to generate (if not escalated)
    ↓
LLM generates documents
    ↓
User reviews documents
    ↓
User mails/submits documents to IRS
    ↓
Follow-up guidance (monitor for IRS response)
```

### Hard-Stop Conditions

If any hard-stop is triggered, workflow halts:
- User is routed to attorney escalation resources
- Workflow does not proceed to document generation
- Clear warning messages explain why
- Attorney referral document generated

### Multi-LLM Integration

Each service uses `/api/extract` which:
1. Tries primary provider (Claude)
2. Falls back to Gemini if Claude fails
3. Falls back to OpenAI if Gemini fails
4. Returns error if all fail
5. Provides token usage and model information

## Compliance & Legal

### IRS Statutory References

- **IRC § 6213** - Restrictions on assessments and collections
- **IRC § 7123** - Administrative appeal rights (Office of Appeals)
- **IRC § 7521** - Procedural rights of taxpayers
- **IRC § 6501** - Statute of Limitations (generally 3 years, 6 years for 25%+ underreporting)
- **Treasury Reg. § 601.105** - Appeals procedures
- **IRM 8.0** - Internal Revenue Manual procedures for examinations

### Jurisdictional Considerations

- **Domestic deadline:** 30 days from notice date
- **Outside US deadline:** 60 days from notice date (IRC § 6213(d))
- **Tax Court deadline:** 90 days to file petition (150 days if outside US)
- **Appeals deadline:** Within statutory restrictions period

### Disclaimers

All documents include:
- "This is not legal advice"
- "Consult a tax professional or attorney before filing"
- "This tool is not a substitute for legal representation"
- "Notice Respond is not a law firm"

### Assumption Flagging

Low-confidence extractions are flagged:
```
[ASSUMPTION] Deadline extraction confidence is 72%.
Verify deadline from notice: 2026-10-03

[ASSUMPTION] Proposed adjustment confidence is 68%.
Verify each line item carefully before responding.
```

### Fraud Risk Assessment

- 0-30%: Low risk (proceed with response)
- 30-50%: Medium risk (professional guidance recommended)
- 50-100%: High risk (attorney representation mandatory)

## Performance & Scalability

### Token Usage

- Extraction: ~2,000-3,500 tokens per notice
- Classification: ~800 tokens
- Document generation: ~2,500-4,000 tokens per document
- Total per workflow: ~8,000-10,000 tokens

### Multi-LLM Strategy

- Claude (primary): Best at tax law analysis, complex extractions
- Gemini (secondary): Fast, efficient fallback
- OpenAI (tertiary): Reliable, widely available

### Confidence Scoring

Each extracted field has 0-1 confidence:
- 0.95+ = Certain, no manual review needed
- 0.85-0.95 = Likely, recommend user confirmation
- 0.75-0.85 = Possible, flag for manual check
- <0.75 = Uncertain, require user input

## Testing

### Test Scenarios

1. **Simple Agreement** - Taxpayer agrees with all items
2. **Substantiated Disagreement** - Taxpayer disputes with evidence
3. **Partial Agreement** - Taxpayer agrees on some, disputes others
4. **Appeal Request** - Taxpayer wants independent review
5. **Extension Request** - Taxpayer needs more time
6. **Fraud Indicators** - Hard-stop condition triggers attorney escalation
7. **Deadline Passed** - Hard-stop condition triggers attorney escalation
8. **Low Confidence Extraction** - Assumptions flagged for manual review

### Unit Tests

- Extraction validation
- Classification routing logic
- Document generation
- Guardrail enforcement
- Hard-stop condition detection
- Compliance checking

## Future Enhancements

1. **PDF/Image OCR** - Integrate document OCR for image uploads
2. **Amended Return Strategy** - Generate Form 1040-X for certain situations
3. **Penalty Abatement** - Generate reasonable cause statements
4. **Multi-Year Reviews** - Handle notices covering multiple years
5. **Statute of Limitations** - Calculate deadline based on examination issue
6. **Payment Plan Preparation** - Generate installment agreement requests
7. **Collection Due Process** - Handle CDP hearing requests
8. **Entity Responses** - Support S-Corp, Partnership, C-Corp notices
9. **Multi-Language** - Support Spanish, Mandarin, Vietnamese
10. **Attorney Directory** - Local tax attorney referral integration
11. **Secure Portal** - Upload previous correspondence history
12. **Filing Tracking** - Monitor IRS response timeline

## Files

```
apps/verticals/notice-respond/
├── src/
│   ├── components/
│   │   └── cp2000-workflow.tsx (UI component - future)
│   └── domain/
│       └── workflows/
│           └── cp2000/
│               ├── types.ts (type definitions)
│               ├── extraction.ts (LLM extraction)
│               ├── classification.ts (routing logic)
│               ├── document-generation.ts (document templates)
│               └── guardrails.ts (compliance checks)
├── server/
│   └── api/
│       └── workflows/
│           └── cp2000/
│               ├── extract.ts (extraction endpoint)
│               ├── classify.ts (classification endpoint)
│               └── generate-document.ts (document generation endpoint)
└── CP2000_WORKFLOW.md (this file)
```

## License & Attribution

© 2026 MailMyPDF. All rights reserved.

This workflow is part of the Notice Respond vertical of MailMyPDF and adheres to all applicable IRS procedures and regulations.
