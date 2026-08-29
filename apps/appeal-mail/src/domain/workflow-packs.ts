import { registerDomainPack, type DomainPackSet } from "./workflow-capabilities";

const deniedClaimPack: DomainPackSet = {
  engine: "appeal",
  document: {
    name: "Denied claim source-document intelligence",
    acceptedTypes: ["application/pdf", "image/png", "image/jpeg"],
    classifierHints: ["claim denial", "denial letter", "adverse decision", "explanation of benefits", "claim reference", "appeal instructions"],
    extractionSchema: ["issuer", "decisionType", "referenceNumber", "decisionDate", "deadline", "denialReasons", "citedRules", "appealInstructions", "keyFacts", "evidenceMentioned", "uncertainties", "sourceCitations"],
    minConfidence: 0.8,
  },
  deadline: {
    name: "Denied claim deadline verification",
    triggeringEvents: ["notice date", "receipt date", "decision date", "explicit appeal deadline"],
    sourcePriority: ["adverse decision", "plan/policy claims procedure", "issuer appeal instructions", "verified federal or state authority"],
    jurisdictionDependent: true,
    computationRules: ["Use an explicit source deadline when present.", "Never invent a deadline when the source does not provide one.", "Flag jurisdiction-, plan-, or claim-type-dependent timing for review.", "Preserve the source phrase and page reference for every computed or extracted deadline."],
  },
  evidence: {
    name: "Denied claim evidence matrix",
    evidenceTypes: ["denial notice", "policy/plan/agreement", "claim record", "EOB", "correspondence", "medical or repair/property records", "proof of prior submission"],
    sufficiencyRules: ["Material response assertions must map to source evidence or be explicitly marked as user-provided.", "Missing critical evidence blocks unsupported material claims.", "The denial itself is preserved as the primary source document."],
    contradictionRules: ["decision date vs correspondence date", "claim/reference number mismatch", "denial reason vs supplied record", "policy citation mismatch", "deadline mismatch"],
    missingEvidenceBehavior: "Flag the gap, explain why it matters, and block unsupported material claims until the user supplies evidence or explicitly accepts the limitation.",
  },
  analysis: {
    name: "Denied claim appeal analysis",
    capabilities: ["contradiction-analysis", "xray-analysis", "timeline-analysis", "stress-testing", "response-strategy"],
    orderedChecks: ["classify", "extract", "verify deadline", "x-ray decision", "build timeline", "find contradictions", "map evidence", "identify grounds", "rank risks", "stress-test response"],
    riskFactors: ["unknown deadline", "unsupported coverage or eligibility assertion", "material factual contradiction", "missing critical evidence", "missing recipient instructions", "unsupported requested relief"],
    outputSections: ["decision summary", "denial reasons", "timeline", "issues", "contradictions", "evidence gaps", "appeal grounds", "risks", "response strategy"],
  },
  draft: {
    name: "Denied claim appeal drafting",
    draftType: "evidence-supported appeal letter",
    requiredSections: ["recipient/reference", "opening", "response to each denial reason", "supported facts", "evidence references", "requested reconsideration/review", "closing"],
    prohibitedUnsupportedClaims: ["guaranteed outcome", "invented policy language", "invented medical/repair facts", "invented deadlines", "unsupported legal conclusions"],
    toneRules: ["factual", "specific", "professional", "non-adversarial", "request-focused", "no promises of success"],
  },
  validation: {
    name: "Denied claim independent validation",
    factualChecks: ["issuer/reference/date match", "each material factual statement has a source", "deadline is source-backed or explicitly unknown", "requested relief matches the case"],
    requirementChecks: ["all stated appeal instructions addressed", "recipient supplied", "mailing method selected", "final letter present"],
    unsupportedAssertionChecks: ["policy language", "medical/coverage/eligibility claims", "outcome promises", "invented chronology"],
    adversarialChecks: ["contradiction scan", "missing-evidence scan", "deadline mismatch", "recipient mismatch", "unsupported relief", "overstatement of certainty"],
  },
  submission: {
    name: "Denied claim physical-mail fulfillment",
    methods: ["standard", "certified", "registered"],
    recipientRules: ["complete recipient fields", "state and ZIP present", "user explicitly confirms recipient", "provider document must be the finalized response, not the source denial"],
    supportsMailing: true,
    supportsTracking: true,
    proofRequirements: ["provider communication id", "payment id", "submission timestamp", "final-letter document id", "provider status", "tracking number when supplied"],
  },
};

registerDomainPack("denied-claim", deniedClaimPack);
export { deniedClaimPack };
