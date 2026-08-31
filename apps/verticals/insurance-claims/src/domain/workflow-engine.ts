/**
 * Insurance Claims — Workflow Engine
 * Domain-specific analysis, drafting, validation, and pricing for insurance claim disputes.
 */

export interface InsuranceAnalysisResult {
  summary: string;
  claimType: string;
  insurer: string;
  policyNumber: string;
  claimNumber: string;
  denialDate: string;
  denialReasons: string[];
  deadline: string;
  keyFacts: string[];
  evidenceMentioned: string[];
  issues: { issue: string; whyItMatters: string; evidenceNeeded: string[] }[];
  confidence: "high" | "medium" | "low";
}

export interface InsuranceDraftConfig {
  workflowId: string;
  workflowName: string;
  systemPrompt: string;
  validationPrompt: string;
  requiredSections: string[];
  forbiddenPhrases: string[];
  pricing: {
    preparationFee: number;
    includedResponsePages: number;
    supportingPagePrice: number;
    standardMail: number;
    certifiedMail: number;
    registeredMail: number;
    largePacketThresholdSheets: number;
    largePacketFee: number;
  };
}

export const INSURANCE_WORKFLOW_CONFIGS: Record<string, InsuranceDraftConfig> = {
  "new-claim": {
    workflowId: "new-claim",
    workflowName: "Prepare an Insurance Claim",
    systemPrompt: "Draft a factual, persuasive prepare an insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prepare an insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "homeowners-claim": {
    workflowId: "homeowners-claim",
    workflowName: "Prepare a Homeowners Insurance Claim",
    systemPrompt: "Draft a factual, persuasive prepare a homeowners insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prepare a homeowners insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "auto-claim": {
    workflowId: "auto-claim",
    workflowName: "Prepare an Auto Insurance Claim",
    systemPrompt: "Draft a factual, persuasive prepare an auto insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prepare an auto insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "commercial-property-claim": {
    workflowId: "commercial-property-claim",
    workflowName: "Prepare a Commercial Property Claim",
    systemPrompt: "Draft a factual, persuasive prepare a commercial property claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prepare a commercial property claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "renters-insurance-claim": {
    workflowId: "renters-insurance-claim",
    workflowName: "Prepare a Renters Insurance Claim",
    systemPrompt: "Draft a factual, persuasive prepare a renters insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prepare a renters insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "denied-claim": {
    workflowId: "denied-claim",
    workflowName: "Respond to a Denied Insurance Claim",
    systemPrompt: "Draft a factual, persuasive respond to a denied insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a denied insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "denied-home-claim": {
    workflowId: "denied-home-claim",
    workflowName: "Respond to a Denied Home Insurance Claim",
    systemPrompt: "Draft a factual, persuasive respond to a denied home insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a denied home insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "auto-claim-denial": {
    workflowId: "auto-claim-denial",
    workflowName: "Respond to a Denied Auto Insurance Claim",
    systemPrompt: "Draft a factual, persuasive respond to a denied auto insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a denied auto insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "life-insurance-denial": {
    workflowId: "life-insurance-denial",
    workflowName: "Respond to a Denied Life Insurance Claim",
    systemPrompt: "Draft a factual, persuasive respond to a denied life insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a denied life insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "health-medical-denial": {
    workflowId: "health-medical-denial",
    workflowName: "Respond to a Health or Medical Insurance Denial",
    systemPrompt: "Draft a factual, persuasive respond to a health or medical insurance denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a health or medical insurance denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "disability-claim-denial": {
    workflowId: "disability-claim-denial",
    workflowName: "Respond to a Disability Insurance Denial",
    systemPrompt: "Draft a factual, persuasive respond to a disability insurance denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a disability insurance denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "workers-comp-denial": {
    workflowId: "workers-comp-denial",
    workflowName: "Respond to a Workers Compensation Denial",
    systemPrompt: "Draft a factual, persuasive respond to a workers compensation denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a workers compensation denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "medical-necessity-appeal": {
    workflowId: "medical-necessity-appeal",
    workflowName: "Medical Necessity Appeal",
    systemPrompt: "Draft a factual, persuasive medical necessity appeal letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this medical necessity appeal draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "prior-auth-denial": {
    workflowId: "prior-auth-denial",
    workflowName: "Prior Authorization Denial",
    systemPrompt: "Draft a factual, persuasive prior authorization denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this prior authorization denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "out-of-network-denial": {
    workflowId: "out-of-network-denial",
    workflowName: "Out-of-Network Denial",
    systemPrompt: "Draft a factual, persuasive out-of-network denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this out-of-network denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "water-damage-claim": {
    workflowId: "water-damage-claim",
    workflowName: "Water Damage Insurance Claim",
    systemPrompt: "Draft a factual, persuasive water damage insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this water damage insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "roof-damage-claim": {
    workflowId: "roof-damage-claim",
    workflowName: "Roof Damage Insurance Claim",
    systemPrompt: "Draft a factual, persuasive roof damage insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this roof damage insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "fire-smoke-claim": {
    workflowId: "fire-smoke-claim",
    workflowName: "Fire / Smoke Damage Claim",
    systemPrompt: "Draft a factual, persuasive fire / smoke damage claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this fire / smoke damage claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "property-damage-claim": {
    workflowId: "property-damage-claim",
    workflowName: "Property Damage Claim",
    systemPrompt: "Draft a factual, persuasive property damage claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this property damage claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "hail-damage-claim": {
    workflowId: "hail-damage-claim",
    workflowName: "Hail Damage Insurance Claim",
    systemPrompt: "Draft a factual, persuasive hail damage insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this hail damage insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "theft-vandalism-claim": {
    workflowId: "theft-vandalism-claim",
    workflowName: "Theft or Vandalism Claim",
    systemPrompt: "Draft a factual, persuasive theft or vandalism claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this theft or vandalism claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "mold-damage-claim": {
    workflowId: "mold-damage-claim",
    workflowName: "Mold Damage Insurance Claim",
    systemPrompt: "Draft a factual, persuasive mold damage insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this mold damage insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "flood-damage-claim": {
    workflowId: "flood-damage-claim",
    workflowName: "Flood Damage Insurance Claim",
    systemPrompt: "Draft a factual, persuasive flood damage insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this flood damage insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "underpaid-claim": {
    workflowId: "underpaid-claim",
    workflowName: "Dispute an Underpaid Insurance Claim",
    systemPrompt: "Draft a factual, persuasive dispute an underpaid insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this dispute an underpaid insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "claim-dispute": {
    workflowId: "claim-dispute",
    workflowName: "Dispute an Insurance Claim",
    systemPrompt: "Draft a factual, persuasive dispute an insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this dispute an insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "coverage-denial": {
    workflowId: "coverage-denial",
    workflowName: "Respond to a Coverage Denial",
    systemPrompt: "Draft a factual, persuasive respond to a coverage denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this respond to a coverage denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "insurance-appeal": {
    workflowId: "insurance-appeal",
    workflowName: "Appeal an Insurance Denial",
    systemPrompt: "Draft a factual, persuasive appeal an insurance denial letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this appeal an insurance denial draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "supplemental-claim": {
    workflowId: "supplemental-claim",
    workflowName: "Supplemental Insurance Claim",
    systemPrompt: "Draft a factual, persuasive supplemental insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this supplemental insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "business-interruption-claim": {
    workflowId: "business-interruption-claim",
    workflowName: "Business Interruption Insurance Claim",
    systemPrompt: "Draft a factual, persuasive business interruption insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this business interruption insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  },
  "total-loss-claim": {
    workflowId: "total-loss-claim",
    workflowName: "Total Loss Insurance Claim",
    systemPrompt: "Draft a factual, persuasive total loss insurance claim letter. Address the specific insurance issue, policy provisions, and factual basis for the claim. Cite supplied evidence references. Never invent facts, dates, policy language, or outcomes. Distinguish established facts from arguments.",
    validationPrompt: "Audit this total loss insurance claim draft. Check for claim/policy number consistency, date accuracy, evidence citations, and deadline compliance. Return JSON: {valid:boolean, issues:string[], suggestions:string[]}.",
    requiredSections: ["Dear", "Sincerely", "Re:"],
    forbiddenPhrases: ["guaranteed outcome", "I promise", "you must reverse", "you must pay"],
    pricing: { preparationFee: 49, includedResponsePages: 5, supportingPagePrice: 0.25, standardMail: 1.15, certifiedMail: 4.35, registeredMail: 15.40, largePacketThresholdSheets: 20, largePacketFee: 5.00 },
  }
};

export function getInsuranceWorkflowConfig(workflowId: string): InsuranceDraftConfig | undefined {
  // Check specific config first, fall back to denied-claim as default template
  return INSURANCE_WORKFLOW_CONFIGS[workflowId] ?? INSURANCE_WORKFLOW_CONFIGS["denied-claim"];
}

export function calculateInsurancePricing(
  config: InsuranceDraftConfig,
  supportingSheets: number,
  mailingMethod: "standard" | "certified" | "registered",
) {
  const P = config.pricing;
  const mailing = mailingMethod === "standard" ? P.standardMail : mailingMethod === "certified" ? P.certifiedMail : P.registeredMail;
  const largePacket = supportingSheets + P.includedResponsePages >= P.largePacketThresholdSheets ? P.largePacketFee : 0;
  const total = P.preparationFee + supportingSheets * P.supportingPagePrice + mailing + largePacket;
  return { preparationFee: P.preparationFee, includedResponsePages: P.includedResponsePages, supportingSheets, mailingMethod, mailingFee: mailing, largePacketFee: largePacket, total: Number(total.toFixed(2)) };
}
