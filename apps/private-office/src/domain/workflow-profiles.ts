import type { WorkflowId } from "./workflows";

export interface WorkflowProfile {
  id: WorkflowId;
  slug: string;
  family: string;
  primaryKeyword: string;
  supportingKeywords: string[];
  searchIntent: "transactional" | "commercial" | "problem";
  problem: string;
  outcome: string;
  recipientRole: string;
  requiredFacts: string[];
  evidenceRequirements: string[];
  deadlinePolicy: string;
  objectivePrompt: string;
  draftSubject: string;
  disclaimer: string;
  pricing: {
    preparationFee: number;
    includedResponsePages: number;
    responsePagePrice: number;
    supportingPagePrice: number;
    standardMail: number;
    certifiedMail: number;
    certifiedReturnReceipt?: number;
    registeredMail?: number;
  };
}

const privateOfficeDisclaimer =
  "Private Office provides document preparation, evidence organization, and mailing assistance. It is not a law firm and does not provide legal advice, legal representation, or guarantee any outcome. You remain responsible for the facts and decisions in your matter.";

export const workflowProfiles: Record<WorkflowId, WorkflowProfile> = {
  "contractor-dispute": {
    id: "contractor-dispute",
    slug: "contractor-dispute",
    family: "Property",
    primaryKeyword: "contractor dispute letter",
    supportingKeywords: [
      "contractor dispute letter template",
      "construction defect notice",
      "letter to contractor for defective work",
      "contractor demand letter",
      "how to document contractor dispute",
    ],
    searchIntent: "commercial",
    problem:
      "A contractor performed defective, incomplete, or unauthorized work, or disputes have arisen over billing, scope, or performance under a construction or improvement agreement.",
    outcome:
      "Create a documented contractor dispute letter identifying the property, the contractor, the agreement, the defects or issues, the relevant dates, the evidence, and the requested resolution.",
    recipientRole: "contractor",
    requiredFacts: [
      "property address",
      "contractor name",
      "agreement reference",
      "dispute description",

    ],
    evidenceRequirements: [
      "contract or written agreement",
      "invoices or billing records",
      "payment records or receipts",
      "photos of defects or incomplete work",
      "correspondence with contractor",
      "permits or inspection reports when relevant",
    ],
    deadlinePolicy:
      "Capture all dates visible in the agreement, invoices, and correspondence. Flag any stated deadlines for cure, response, or filing. Do not invent a statutory deadline — surface date facts for human review.",
    objectivePrompt:
      "What specific resolution are you requesting from the contractor — repair, refund, completion, correction, or other action?",
    draftSubject: "Notice of Contractor Dispute",
    disclaimer: privateOfficeDisclaimer,
    pricing: {
      preparationFee: 49.99,
      includedResponsePages: 8,
      responsePagePrice: 0,
      supportingPagePrice: 0,
      standardMail: 4.99,
      certifiedMail: 12.99,
      certifiedReturnReceipt: 18.99,
      registeredMail: 24.99,
    },
  },
  "property-insurance-claim": {
    id: "property-insurance-claim",
    slug: "property-insurance-claim",
    family: "Property",
    primaryKeyword: "property insurance claim letter",
    supportingKeywords: [
      "insurance claim dispute letter",
      "denied insurance claim letter",
      "insurance claim reconsideration letter",
      "insurance supplemental claim letter",
      "insurance claim underpayment",
      "property damage insurance claim",
    ],
    searchIntent: "commercial",
    problem:
      "A property owner's insurance claim has been denied, underpaid, delayed, or disputed by the insurer — or a supplemental claim is needed for additional damage or repair costs discovered after the initial claim.",
    outcome:
      "Create a documented property insurance claim letter identifying the property, the policy, the claim, the damage, the insurer's position, the evidence, the chronology, and the requested resolution.",
    recipientRole: "insurer",
    requiredFacts: [
      "property address",
      "insurer name",
      "claim number",
      "date of loss",
      "description of damage",
      "insurer position",
    ],
    evidenceRequirements: [
      "policy documents or declarations page",
      "claim correspondence from insurer",
      "denial letter or explanation of benefits",
      "payment statements or claim summaries",
      "repair estimates or contractor bids",
      "photographs of property damage",
      "inspection reports or engineer reports",
      "receipts for repairs or temporary mitigation",
      "prior communications with insurer",
    ],
    deadlinePolicy:
      "Insurance claim timelines are governed by the policy, state law, and the claim's procedural posture. Capture all dates visible in correspondence, denial letters, and policy documents. Distinguish known deadlines explicitly stated in policy or correspondence from potential deadlines that depend on jurisdiction or policy provisions. Flag any stated response deadlines or proof-of-loss requirements as known deadlines. Flag any limitation periods or statutory deadlines as potential deadlines requiring verification. Do not invent a statutory deadline. Potential deadline identified — verify against the applicable policy and jurisdiction. Surface all date facts for human review.",
    objectivePrompt:
      "What specific resolution are you requesting from the insurer — reconsideration of denial, supplemental payment, additional inspection, written explanation, or other documented resolution?",
    draftSubject: "Property Insurance Claim Correspondence",
    disclaimer: privateOfficeDisclaimer,
    pricing: {
      preparationFee: 39.99,
      includedResponsePages: 6,
      responsePagePrice: 0,
      supportingPagePrice: 0,
      standardMail: 4.99,
      certifiedMail: 12.99,
      certifiedReturnReceipt: 18.99,
      registeredMail: 24.99,
    },
  },
  "bank-wire-dispute": {
    id: "bank-wire-dispute",
    slug: "bank-wire-dispute",
    family: "Financial",
    primaryKeyword: "bank wire transfer dispute letter",
    supportingKeywords: [
      "wire transfer dispute",
      "unauthorized wire transfer letter",
      "bank transfer dispute letter",
      "wire transfer recall request",
      "bank reimbursement request",
      "wire fraud documentation",
      "disputed transaction letter",
    ],
    searchIntent: "commercial",
    problem:
      "A bank or wire transfer has been disputed — an unauthorized wire, mistaken transfer, beneficiary or account error, bank refusal, delayed investigation, or disputed transaction — and the account holder needs to document the matter with transaction records, chronology, and professional correspondence to the financial institution.",
    outcome:
      "Create a documented bank and wire transfer dispute letter identifying the financial institution, the account holder, the transaction, the dispute, the bank's response, the evidence, the chronology, and the requested resolution.",
    recipientRole: "bank",
    requiredFacts: [
      "financial institution",
      "account holder name",
      "transaction date",
      "transaction amount",
      "dispute description",
      "bank response",
    ],
    evidenceRequirements: [
      "bank statement showing the transaction",
      "wire transfer confirmation or receipt",
      "transaction confirmation or transfer record",
      "bank correspondence regarding the dispute",
      "dispute or recall request documentation",
      "bank investigation response or status update",
      "beneficiary or recipient information",
      "relevant invoices contracts or agreements",
      "supporting communications email chat or phone logs",
    ],
    deadlinePolicy:
      "Financial transaction dispute timelines vary by transaction type, institution, jurisdiction, account type, applicable agreement, and whether the transaction is classified as unauthorized or fraudulent. Capture all dates visible in bank statements, correspondence, and account agreements. Distinguish known deadlines explicitly stated in bank correspondence, account agreements, or documented policy from potential deadlines that depend on jurisdiction, regulator rules, or fraud classification. Flag any stated response deadlines, investigation timeframes, or claim windows as known deadlines. Flag any regulatory deadlines or statutory limitation periods as potential deadlines requiring verification. Do not invent a regulatory deadline. Potential deadline identified — verify against the applicable account agreement, institution policy, and jurisdiction. Surface all date facts for human review.",
    objectivePrompt:
      "What specific resolution are you requesting from the financial institution — investigation, recall, correction, reimbursement, written explanation, status update, document preservation, or other documented resolution?",
    draftSubject: "Bank and Wire Transfer Dispute Correspondence",
    disclaimer:
      "Private Office provides document preparation, evidence organization, and mailing assistance. It is not a law firm, bank, regulator, or law enforcement agency and does not provide legal advice, determine whether a transaction was legally unauthorized, or guarantee any outcome including recovery. You remain responsible for the facts and decisions in your matter.",
    pricing: {
      preparationFee: 49.99,
      includedResponsePages: 8,
      responsePagePrice: 0,
      supportingPagePrice: 0,
      standardMail: 4.99,
      certifiedMail: 12.99,
      certifiedReturnReceipt: 18.99,
      registeredMail: 24.99,
    },
  },
  "trust-beneficiary-notice": {
    id: "trust-beneficiary-notice",
    slug: "trust-beneficiary-notice",
    family: "Trust & Estate",
    primaryKeyword: "trust beneficiary notice",
    supportingKeywords: [
      "beneficiary letter to trustee",
      "request trust accounting",
      "beneficiary information request",
      "trustee communication letter",
      "trust distribution request",
      "beneficiary request for trust documents",
      "trust beneficiary correspondence",
    ],
    searchIntent: "commercial",
    problem:
      "A trust beneficiary needs to document a trust matter — requesting information, accounting, distribution status, clarification from the trustee, or submitting documentation — and requires professional correspondence with a clear factual record, chronology, and proof of delivery.",
    outcome:
      "Create a documented trust beneficiary notice or correspondence identifying the trust, the trustee, the beneficiary, the matter, the trustee's position, the evidence, the chronology, and the requested resolution.",
    recipientRole: "trustee",
    requiredFacts: [
      "trust name",
      "trustee name",
      "beneficiary name",
      "relevant date",
      "matter description",
      "trustee position",
    ],
    evidenceRequirements: [
      "trust instrument or trust document",
      "amendments or restatements",
      "trustee correspondence",
      "beneficiary notice or prior communication",
      "accounting or financial records",
      "distribution records",
      "inventory or asset documentation",
      "court documents when applicable",
      "death certificate when relevant",
      "supporting communications",
    ],
    deadlinePolicy:
      "Trust and beneficiary deadlines depend on jurisdiction, trust language, event type, applicable statute, notice date, trustee action, and court involvement. Capture all dates visible in trust documents, trustee correspondence, and court filings. Distinguish known deadlines explicitly stated in the trust instrument, trustee correspondence, or court orders from potential deadlines that depend on jurisdiction, applicable statute, or trust provisions. Flag any stated response deadlines, notice periods, or accounting timeframes as known deadlines. Flag any statutory limitation periods, trust-code deadlines, or court-imposed deadlines as potential deadlines requiring verification. Do not invent a legal deadline. Potential deadline identified — verify against the applicable trust documents, jurisdiction, and professional guidance. Surface all date facts for human review.",
    objectivePrompt:
      "What specific resolution are you requesting from the trustee — provide accounting, distribute assets, respond to information request, clarify trust provisions, acknowledge beneficiary status, preserve documents, or other documented resolution?",
    draftSubject: "Trust Beneficiary Correspondence",
    disclaimer:
      "Private Office provides document preparation, evidence organization, and mailing assistance. It is not a law firm, fiduciary, trustee, court, or government agency and does not provide legal advice, determine beneficiary status, interpret trust instruments as legal conclusions, determine whether a trustee has violated fiduciary duties, or guarantee any outcome including inheritance or distribution. You remain responsible for the facts and decisions in your matter.",
    pricing: {
      preparationFee: 39.99,
      includedResponsePages: 4,
      responsePagePrice: 0,
      supportingPagePrice: 0,
      standardMail: 4.99,
      certifiedMail: 12.99,
      certifiedReturnReceipt: 18.99,
      registeredMail: 24.99,
    },
  },
  "security-deposit-dispute": {
    id: "security-deposit-dispute",
    slug: "security-deposit-dispute",
    family: "Property",
    primaryKeyword: "security deposit dispute letter",
    supportingKeywords: [
      "security deposit return letter",
      "landlord security deposit dispute",
      "deduction dispute letter",
      "move-out condition letter",
      "security deposit demand letter",
      "landlord tenant deposit dispute",
      "unauthorized deduction letter",
    ],
    searchIntent: "commercial",
    problem:
      "A tenant's security deposit has not been returned, has been partially returned with disputed deductions, or the landlord has charged for damage the tenant disputes — and the tenant needs to document the dispute with lease evidence, move-in and move-out condition records, correspondence, and professional correspondence to the landlord or property manager.",
    outcome:
      "Create a documented security deposit dispute letter identifying the rental property, the landlord or property manager, the lease, the deposit amount, the disputed deductions, the condition evidence, the chronology, and the requested resolution.",
    recipientRole: "landlord",
    requiredFacts: [
      "rental property address",
      "landlord or property manager name",
      "lease or rental agreement reference",
      "deposit amount",
      "dispute description",
      "landlord response",
    ],
    evidenceRequirements: [
      "lease or rental agreement",
      "move-in inspection or condition report",
      "move-out inspection or condition report",
      "photos of move-in and move-out condition",
      "security deposit receipt or statement",
      "deduction itemization or itemized statement",
      "correspondence with landlord or property manager",
      "rent payment records",
      "repair receipts or estimates when relevant",
    ],
    deadlinePolicy:
      "Security deposit return timelines are governed by the lease, state law, and the jurisdiction. Capture all dates visible in the lease, correspondence, and deposit statements. Distinguish known deadlines explicitly stated in the lease, deposit itemization, or landlord correspondence from potential deadlines that depend on jurisdiction or state statute. Flag any stated return deadlines or response timeframes as known deadlines. Flag any statutory deadlines or limitation periods as potential deadlines requiring verification. Do not invent a statutory deadline. Potential deadline identified — verify against the applicable lease, state law, and jurisdiction. Surface all date facts for human review.",
    objectivePrompt:
      "What specific resolution are you requesting from the landlord or property manager — full deposit return, corrected deduction, written explanation, refund of unauthorized charges, or other documented resolution?",
    draftSubject: "Security Deposit Dispute Correspondence",
    disclaimer:
      "Private Office provides document preparation, evidence organization, and mailing assistance. It is not a law firm, landlord-tenant court, housing authority, or government agency and does not provide legal advice, determine the lawful amount of a deposit, interpret lease provisions as legal conclusions, or guarantee any outcome including deposit return. You remain responsible for the facts and decisions in your matter.",
    pricing: {
      preparationFee: 39.99,
      includedResponsePages: 4,
      responsePagePrice: 0,
      supportingPagePrice: 0,
      standardMail: 4.99,
      certifiedMail: 12.99,
      certifiedReturnReceipt: 18.99,
      registeredMail: 24.99,
    },
  },
};
