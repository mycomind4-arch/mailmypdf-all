/* ═══════════════════════════════════════════════════════════
   INSURANCE DENIAL FIXTURES — representative test cases that
   exercise the full pipeline: extraction → analysis → findings
   → evidence → strategy → drafting → validation.

   Cases:
   1. Strong appeal — clear factual error, good evidence
   2. Weak appeal — vague denial, no supporting evidence
   3. Contradictory evidence — dates conflict between docs
   4. Missing critical evidence — denial references docs not provided
   5. Deadline concern — deadline is urgent
   6. Poor-quality source — garbled extraction, low confidence
   7. Insufficient explanation — denial gives no real reason

   ═══════════════════════════════════════════════════════════ */

export interface DenialFixture {
  id: string;
  label: string;
  description: string;
  text: string;
  scenario: string;
  expectedFields: {
    agency?: string;
    referenceNumber?: string;
    decisionDate?: string;
    deadlineDate?: string;
    denialReasons?: string[];
  };
  expectedClassification: "denial_letter" | "explanation_of_benefits" | "agency_notice";
  expectedStrength: "strong" | "weak" | "moderate";
}

// ── Fixture 1: Strong Appeal ─────────────────────────────────

export const strongAppeal: DenialFixture = {
  id: "strong-appeal",
  label: "Strong Appeal — Clear Factual Error",
  description: "Denial cites wrong policy provision. User has policy document showing coverage.",
  scenario: "Insurance company denied a claim for roof repair citing a 'wear and tear' exclusion, but the policy explicitly covers storm damage and the damage was from a named storm.",
  text: `
CLAIM DENIAL NOTICE

Blue Shield Insurance Company
Claim Number: CLM-2026-04829
Policy Number: HP-7748293

Date: July 15, 2026

Dear Policyholder,

We have reviewed your claim for roof repair submitted on July 1, 2026. After careful consideration, we are denying your claim.

Reason for Denial:
The damage to your roof has been determined to be the result of normal wear and tear. Your policy (Section 4.2, Exclusions) excludes coverage for damage caused by wear and tear, deterioration, or aging of materials.

You have the right to appeal this decision. Appeals must be submitted within 60 days of the date of this letter. Please send your appeal to:

Blue Shield Insurance Company
Appeals Department
P.O. Box 29187
Dallas, TX 75202

Include your claim number (CLM-2026-04829) in all correspondence.

Sincerely,
Claims Department
Blue Shield Insurance Company
`.trim(),
  expectedFields: {
    agency: "Blue Shield Insurance Company",
    referenceNumber: "CLM-2026-04829",
    decisionDate: "2026-07-15",
    deadlineDate: "2026-09-13",
    denialReasons: ["wear and tear", "exclusion"],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "strong",
};

// ── Fixture 2: Weak Appeal ───────────────────────────────────

export const weakAppeal: DenialFixture = {
  id: "weak-appeal",
  label: "Weak Appeal — Vague Denial, No Evidence",
  description: "Denial is unclear, user has no supporting documentation.",
  scenario: "Insurance company denied a claim with minimal explanation and the user has no policy document or supporting evidence.",
  text: `
DENIAL LETTER

Acme Insurance
Ref # 4471

Your claim has been denied.

The claim does not meet the requirements under your policy.

You may appeal within 30 days.

Acme Insurance
`.trim(),
  expectedFields: {
    agency: "Acme Insurance",
    referenceNumber: "4471",
    denialReasons: [],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "weak",
};

// ── Fixture 3: Contradictory Evidence ────────────────────────

export const contradictoryEvidence: DenialFixture = {
  id: "contradictory-evidence",
  label: "Contradictory Evidence — Date Conflict",
  description: "Denial says claim was filed October 15, but user's filing receipt shows October 1.",
  scenario: "The insurance company denies the claim stating it was filed late (October 15), but the user has a certified mail receipt showing filing on October 1.",
  text: `
CLAIM DETERMINATION

State Farm Insurance
Claim #: SF-2026-1129
Policy #: AUTO-44928

Determination Date: November 3, 2026

We have denied your claim for the following reason:

Your claim was submitted on October 15, 2026. Under your policy, claims must be filed within 30 days of the incident. Since the incident occurred on September 1, 2026, your claim was filed after the 30-day deadline.

To appeal this decision, submit a written appeal within 45 days to:

State Farm Insurance
Appeals Processing Center
P.O. Box 99172
Bloomington, IL 61702

Reference claim number SF-2026-1129.

Sincerely,
State Farm Claims
`.trim(),
  expectedFields: {
    agency: "State Farm Insurance",
    referenceNumber: "SF-2026-1129",
    decisionDate: "2026-11-03",
    deadlineDate: "2026-12-18",
    denialReasons: ["late filing", "30-day deadline"],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "strong",
};

// ── Fixture 4: Missing Critical Evidence ───────────────────

export const missingEvidence: DenialFixture = {
  id: "missing-evidence",
  label: "Missing Critical Evidence — References Unprovided Documents",
  description: "Denial cites an adjuster report and photos that the user didn't upload.",
  scenario: "The insurance company's denial references an adjuster report and photos that the user doesn't have, making it difficult to evaluate the denial reasons.",
  text: `
DENIAL OF CLAIM

Allstate Insurance Company
Claim Number: AC-2026-7714

Date: August 20, 2026

Dear Policyholder,

We have denied your water damage claim based on the following:

1. Our adjuster's report (dated August 10, 2026) concluded that the water damage was due to a pre-existing plumbing condition, not a covered peril.

2. Photos taken during the August 8, 2026 inspection show evidence of long-term water exposure and mold growth consistent with ongoing leakage rather than sudden damage.

3. Your policy (Section 7.1) excludes damage from gradual water seepage.

You may appeal this decision. Appeals must be filed within 60 days of this letter.

Allstate Insurance Company
Appeals Department
P.O. Box 64891
Northbrook, IL 60062

Reference: AC-2026-7714

Sincerely,
Property Claims Division
Allstate Insurance Company
`.trim(),
  expectedFields: {
    agency: "Allstate Insurance Company",
    referenceNumber: "AC-2026-7714",
    decisionDate: "2026-08-20",
    deadlineDate: "2026-10-19",
    denialReasons: ["pre-existing condition", "gradual seepage", "adjuster report"],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "moderate",
};

// ── Fixture 5: Deadline Concern ──────────────────────────────

export const deadlineConcern: DenialFixture = {
  id: "deadline-concern",
  label: "Deadline Concern — Urgent Deadline",
  description: "Appeal deadline is only 5 days away.",
  scenario: "The user received the denial letter late and the appeal deadline is rapidly approaching.",
  text: `
CLAIM DENIAL

GEICO Insurance
Claim #: GEICO-2026-3392
Policy #: AUTO-882910

Date: December 10, 2026

We have denied your auto repair claim. The estimated repair cost of $3,847.50 exceeds the vehicle's actual cash value of $3,200.00.

You must appeal within 10 days of this letter. Send appeals to:

GEICO Claims Appeals
P.O. Box 9412
Chevy Chase, MD 20815

Sincerely,
GEICO Claims Department
`.trim(),
  expectedFields: {
    agency: "GEICO Insurance",
    referenceNumber: "GEICO-2026-3392",
    decisionDate: "2026-12-10",
    deadlineDate: "2026-12-20",
    denialReasons: ["exceeds actual cash value"],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "moderate",
};

// ── Fixture 6: Poor Quality Source ──────────────────────────

export const poorQuality: DenialFixture = {
  id: "poor-quality",
  label: "Poor Quality Source — Garbled Extraction",
  description: "Document was scanned poorly, resulting in garbled text extraction.",
  scenario: "The denial letter was scanned at low quality, resulting in incomplete text extraction.",
  text: `
CL M D N L No
Pr gress ve Insur nce
C  m N mb r: PR 2026 881
Dat : Jun  15 2026

Y ur cl  m has b  n d n  d.

R as n: P licy xclus on S ct on 12

pp al within 60 d ys
Pr gress ve Insur nce
`.trim(),
  expectedFields: {
    agency: undefined, // garbled — may not extract
    referenceNumber: undefined,
    denialReasons: [],
  },
  expectedClassification: "denial_letter",
  expectedStrength: "weak",
};

// ── Fixture 7: Insufficient Explanation ─────────────────────

export const insufficientExplanation: DenialFixture = {
  id: "insufficient-explanation",
  label: "Insufficient Explanation — No Real Reason Given",
  description: "Denial letter gives no substantive reason for denial.",
  scenario: "The insurance company denies a medical claim but only says 'not covered' without citing any policy provision or explaining why.",
  text: `
EXPLANATION OF BENEFITS

Cigna Health Insurance
Claim #: CG-2026-44219
Member: Jane Doe

Date of Service: September 15, 2026
Provider: Dr. Smith Family Medicine

Service: Office Visit - CPT 99213
Billed: $245.00

Determination: Not Covered

Your claim for the above service has been denied. This service is not covered under your plan.

You may file an appeal within 90 days of the date of this determination. Send appeals to:

Cigna Appeals Department
P.O. Box 18821
Bloomfield, CT 06002

Include your claim number on all correspondence.

Cigna Health Insurance
`.trim(),
  expectedFields: {
    agency: "Cigna Health Insurance",
    referenceNumber: "CG-2026-44219",
    decisionDate: undefined, // date of service, not decision date
    deadlineDate: undefined, // 90 days from letter date, but letter date not explicitly given as a date
    denialReasons: ["not covered"],
  },
  expectedClassification: "explanation_of_benefits",
  expectedStrength: "moderate",
};

// ── All Fixtures ─────────────────────────────────────────────

export const ALL_FIXTURES: DenialFixture[] = [
  strongAppeal,
  weakAppeal,
  contradictoryEvidence,
  missingEvidence,
  deadlineConcern,
  poorQuality,
  insufficientExplanation,
];

export function getFixtureById(id: string): DenialFixture | undefined {
  return ALL_FIXTURES.find((f) => f.id === id);
}
