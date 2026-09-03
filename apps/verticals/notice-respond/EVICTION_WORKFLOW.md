# Eviction Notice Response Workflow

## Overview

This is a production-grade, multi-step workflow for helping California tenants respond to 3-day eviction notices. It incorporates:

- **Multi-LLM extraction** with Claude, Gemini, and OpenAI fallback
- **Intelligent classification** with hard-stop safety gates
- **Legal document generation** with statutory compliance
- **Comprehensive guardrails** ensuring safety and accuracy

## Architecture

### Core Modules

#### 1. **Type System** (`src/domain/workflows/eviction/types.ts`)
Defines all data structures:
- `EvictionNoticeExtraction` - Extracted notice fields
- `EvictionIntakeConfirmation` - User-confirmed extraction data
- `EvictionClassificationResult` - Routing decision and strategy
- `GeneratedDocument` - Generated response letters, declarations, proof of service
- `EvictionWorkflowState` - Complete workflow state machine

#### 2. **Extraction Service** (`src/domain/workflows/eviction/extraction.ts`)
- Calls `/api/extract` endpoint with notice text
- Normalizes LLM output to structured schema
- Provides confidence scoring for each field
- Validates extraction results
- Functions:
  - `extractEvictionNotice()` - Main extraction function
  - `validateDeadlineExtraction()` - Checks deadline validity
  - `validateAmountExtraction()` - Checks amount validity
  - `validateIssuerExtraction()` - Checks issuer validity

#### 3. **Classification Engine** (`src/domain/workflows/eviction/classification.ts`)
Routes tenant through appropriate response path:

**Response Paths:**
- `pay-negotiate` - Tenant can pay; draft payment proposal
- `contest-defend` - Tenant has legal defenses; draft contest letter
- `move-preparation` - Tenant will vacate; provide resources
- `escalate-attorney` - Complex situation; connect to attorney
- `payment-already-made` - Rent was paid; document proof
- `deadline-passed` - Hard-stop condition; mandatory attorney escalation

**Hard-Stop Conditions:**
1. Deadline has passed (today >= deadline_date)
2. Prior court involvement
3. Language barriers
4. Prior eviction history
5. Criminal allegations

#### 4. **Document Generation** (`src/domain/workflows/eviction/document-generation.ts`)
Generates four types of documents:

**1. Payment Proposal Letter**
- Formal letter to landlord proposing payment terms
- Options: full payment, partial payment + plan, extension
- No signature required
- Disclaimer included

**2. Contest/Defense Letter**
- Disputes the notice validity
- Lists applicable defenses:
  - Habitability (CA Civil Code § 1941)
  - Procedural defects
  - Retaliation (CA Civil Code § 1942.5)
  - Payment already made
  - Waiver by landlord
  - Fraud/mistake
- No signature required
- Disclaimer included

**3. Declaration Under Penalty of Perjury**
- Sworn statement documenting tenant's facts
- Uses CA CCP § 2015.5 language
- **Requires tenant signature** (no notary needed)
- Can support unlawful detainer answer if lawsuit filed

**4. Proof of Service Cover Sheet**
- Instructions for mailing/delivery methods
- Certified mail checklist
- Hand delivery documentation
- Email tracking
- Post-mailing guidance

#### 5. **Guardrails & Compliance** (`src/domain/workflows/eviction/guardrails.ts`)
Enforces legal and ethical standards:

**Six Core Guardrails:**
1. **No Auto-Send** - Tenant must manually review and send
2. **No Fabricated Facts** - All claims must be evidence-based
3. **Legal Disclaimer** - All documents include required disclaimers
4. **Attorney Escalation** - Hard-stop conditions route to attorney
5. **Assumption Flagging** - Uncertain facts marked [ASSUMPTION]
6. **Statute Verification** - All statute citations verified

**Compliance Checks:**
- Pre-classification compliance check
- Pre-sending compliance check
- Assumption flagging for low-confidence extractions
- Statute verification against current CA law

### API Endpoints

#### `POST /api/workflows/eviction/extract`
**Request:**
```json
{
  "noticeText": "full text of notice",
  "provider": "claude" // optional: claude, gemini, openai
}
```

**Response:**
```json
{
  "success": true,
  "extraction": {
    "deadline_date": "2026-09-06",
    "deadline_confidence": 0.95,
    "notice_amount_owed": 2400,
    "amount_confidence": 0.90,
    "notice_issuer": "John Doe Property Management",
    "issuer_confidence": 0.92,
    // ... more fields
  },
  "provider": "claude",
  "model": "claude-opus-5"
}
```

#### `POST /api/workflows/eviction/classify`
**Request:**
```json
{
  "intake": { /* EvictionIntakeConfirmation */ },
  "can_pay": true,
  "payment_amount": 2400,
  "has_defenses": false,
  "tenant_status": "current"
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "path": "pay-negotiate",
    "confidence": 0.92,
    "hard_stop": false,
    "recommended_strategy": "Prepare a formal payment proposal...",
    "next_steps": [...]
  }
}
```

#### `POST /api/workflows/eviction/generate-document`
**Request:**
```json
{
  "type": "payment-letter" | "contest-letter" | "declaration" | "proof-of-service",
  "intake": { /* EvictionIntakeConfirmation */ },
  "payload": {
    // Varies by document type
    "payment_option": "full",
    "payment_date": "2026-09-06"
  }
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "type": "payment-letter",
    "title": "Payment Proposal Letter to Landlord",
    "content": "...",
    "markdown_content": "...",
    "requires_signature": false,
    "requires_notary": false,
    "generated_at": "2026-09-03T...",
    "model_used": "claude-3.5-sonnet",
    "provider": "claude"
  }
}
```

### UI Component (`src/components/eviction-workflow.tsx`)

Multi-step React component with 9 stages:

1. **Upload** - User uploads notice PDF/image/text
2. **Extraction Review** - LLM extraction with confidence scores
3. **Intake Questions** - Tenant answers about situation
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
User confirms extraction
    ↓
User answers intake questions
    ↓
Classification engine routes to path
    ↓
Compliance check (guardrails)
    ↓
User selects documents to generate
    ↓
LLM generates documents
    ↓
User reviews documents
    ↓
User signs if required
    ↓
User mails/delivers documents
    ↓
Follow-up guidance (monitor for lawsuit)
```

### Hard-Stop Conditions

If any hard-stop is triggered, workflow halts:
- User is routed to attorney/escalation resources
- Workflow does not proceed to document generation
- Clear warning messages explain why

### Multi-LLM Integration

Each service uses `/api/extract` which:
1. Tries primary provider (Claude)
2. Falls back to Gemini if Claude fails
3. Falls back to OpenAI if Gemini fails
4. Returns error if all fail
5. Provides token usage and model information

## Compliance & Legal

### California Law References

- **CCP § 1161(2)** - 3-Day Notice to Pay Rent or Quit
- **CCP § 1161(3)** - 3-Day Notice to Cure or Quit
- **CCP § 1161(4)** - Unconditional Quit Notice
- **CA Civil Code § 1941** - Implied Warranty of Habitability
- **CA Civil Code § 1942.5** - Anti-Retaliation Protections
- **AB 2343** - Extended deadline to 3 business days (effective Sept 1, 2019)
- **CA CCP § 2015.5** - Unsworn Declaration language

### Disclaimers

All documents include:
- "This is not legal advice"
- "Consult an attorney before filing with a court"
- "This tool is not a substitute for legal representation"
- "Notice Respond is not a law firm"

### Assumption Flagging

Low-confidence extractions are flagged:
```
[ASSUMPTION] Deadline extraction confidence is 72%. 
Verify deadline from notice: 2026-09-06
```

## Performance & Scalability

### Token Usage
- Extraction: ~1,500-2,500 tokens per notice
- Classification: ~500 tokens
- Document generation: ~2,000-3,000 tokens per document
- Total per workflow: ~6,000-7,000 tokens

### Multi-LLM Strategy
- Claude (primary): Best at legal analysis, structured extraction
- Gemini (secondary): Fast, efficient fallback
- OpenAI (tertiary): Reliable, widely available

### Confidence Scoring
Each extracted field has 0-1 confidence:
- 0.95+ = Certain, no manual review needed
- 0.80-0.95 = Likely, recommend user confirmation
- 0.70-0.80 = Possible, flag for manual check
- <0.70 = Uncertain, require user input

## Testing

### Test Scenarios
1. **Valid 3-Day Pay Notice** - Should classify as `pay-negotiate`
2. **Habitability Issues** - Should classify as `contest-defend`
3. **Deadline Passed** - Should trigger hard-stop
4. **Prior Court Involvement** - Should escalate to attorney
5. **Low Extraction Confidence** - Should flag assumptions

### Unit Tests
- Extraction validation
- Classification routing
- Document generation
- Guardrail enforcement

## Future Enhancements

1. **PDF/Image OCR** - Integrate document OCR for image uploads
2. **Unlawful Detainer Answer** - Generate court-ready form UD-105 if lawsuit filed
3. **Evidence Gathering** - Photo checklist for habitability defects
4. **Payment Tracking** - Monitor if landlord accepts payment proposal
5. **Lawsuit Monitoring** - Alert if unlawful detainer filed
6. **Multi-Language** - Support for Spanish, Vietnamese, Chinese
7. **Attorney Directory** - Local attorney referral integration
8. **Legal Aid Finder** - Connect with local legal aid organizations

## Files

```
apps/verticals/notice-respond/
├── src/
│   ├── components/
│   │   └── eviction-workflow.tsx (UI component)
│   └── domain/
│       └── workflows/
│           └── eviction/
│               ├── types.ts (type definitions)
│               ├── extraction.ts (LLM extraction)
│               ├── classification.ts (routing logic)
│               ├── document-generation.ts (document templates)
│               └── guardrails.ts (compliance checks)
├── server/
│   └── api/
│       └── workflows/
│           └── eviction/
│               ├── extract.ts (extraction endpoint)
│               ├── classify.ts (classification endpoint)
│               └── generate-document.ts (document generation endpoint)
└── EVICTION_WORKFLOW.md (this file)
```

## License & Attribution

© 2026 MailMyPDF. All rights reserved.

This workflow is part of the Notice Respond vertical of MailMyPDF and adheres to all applicable California tenant rights laws.
