import { createDocumentExtractionSchema } from "../extraction-schema.js";

/**
 * Canonical extraction schema for insurance/benefit claim-denial documents.
 *
 * The field set is promoted from the mature Appeal Mail insurance document
 * pack. Every non-null extracted value requires source evidence by default;
 * fields that are not present in the source stay null rather than being
 * inferred from general insurance knowledge.
 */
export const claimDenialLetterSchema = createDocumentExtractionSchema({
  id: "claim-denial-letter-v1",
  version: 1,
  documentKinds: [
    "denial_letter",
    "explanation_of_benefits",
    "coverage_decision",
    "claim_determination",
    "benefit_denial",
  ],
  strict: true,
  fields: [
    {
      id: "insurerName",
      label: "Insurer or plan name",
      type: "text",
      description: "The insurer, health plan, benefit plan, or claims administrator named in the decision.",
      required: false,
      maxLength: 300,
    },
    {
      id: "claimNumber",
      label: "Claim number",
      type: "text",
      description: "The claim, case, authorization, or reference number exactly as shown in the source document.",
      required: false,
      maxLength: 200,
    },
    {
      id: "policyNumber",
      label: "Policy or member number",
      type: "text",
      description: "The policy, plan, member, subscriber, or group identifier exactly as shown in the source document.",
      required: false,
      maxLength: 200,
    },
    {
      id: "denialDate",
      label: "Denial date",
      type: "date",
      description: "The date the denial or adverse decision was issued, only when the source identifies that date.",
      required: false,
    },
    {
      id: "denialReasons",
      label: "Denial reasons",
      type: "text_list",
      description: "The stated reasons for denial or adverse determination, preserving the source meaning without adding new reasons.",
      required: true,
    },
    {
      id: "citedPolicyProvisions",
      label: "Cited policy provisions",
      type: "text_list",
      description: "Policy, plan, statute, regulation, guideline, or criteria references explicitly cited by the source document.",
      required: false,
    },
    {
      id: "claimType",
      label: "Claim type",
      type: "text",
      description: "The type of claim, service, benefit, treatment, loss, or coverage issue when the source explicitly identifies it.",
      required: false,
      maxLength: 300,
    },
    {
      id: "amountInDispute",
      label: "Amount in dispute",
      type: "money",
      description: "The disputed amount exactly as displayed in the source. Do not calculate or infer an amount that is not stated.",
      required: false,
    },
    {
      id: "appealDeadline",
      label: "Appeal deadline",
      type: "date",
      description: "An explicit calendar deadline for appeal or review only when the source states the date. Relative periods belong in appealInstructions until separately computed.",
      required: false,
    },
    {
      id: "appealInstructions",
      label: "Appeal instructions",
      type: "text",
      description: "The appeal, reconsideration, review, submission, or escalation instructions stated in the source, including any relative time period.",
      required: false,
      maxLength: 5000,
    },
    {
      id: "requestedService",
      label: "Requested service or benefit",
      type: "text",
      description: "The requested service, treatment, item, benefit, or coverage at issue, only when supported by the source.",
      required: false,
      maxLength: 1000,
    },
    {
      id: "diagnosisCode",
      label: "Diagnosis code",
      type: "text",
      description: "A diagnosis code explicitly printed in the source document.",
      required: false,
      maxLength: 100,
    },
    {
      id: "procedureCode",
      label: "Procedure code",
      type: "text",
      description: "A procedure, service, billing, or authorization code explicitly printed in the source document.",
      required: false,
      maxLength: 100,
    },
  ],
});

export const CLAIM_DENIAL_EXTRACTION_SCHEMA_ID = claimDenialLetterSchema.id;
