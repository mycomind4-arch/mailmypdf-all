/* Domain for court summons response workflow */

export const courtSummonsResponseDomain = {
  workflowId: "court-summons-response",
  name: "Court Summons Response",
  description: "Respond to court summons with answer preparation and court-compliant filing",
  extractionSchemaIds: ["court-summons-analysis"],
  validationRules: [
    {
      rule: "response_deadline_not_passed",
      description: "Response must be filed before the court deadline",
      severity: "error",
    },
    {
      rule: "all_claims_addressed",
      description: "Answer should address each claim in the summons",
      severity: "warning",
    },
    {
      rule: "court_format_compliant",
      description: "Answer must follow court formatting and procedural requirements",
      severity: "error",
    },
  ],
  readinessChecks: [
    {
      check: "summons_provided",
      description: "Complete court summons is provided",
      required: true,
    },
    {
      check: "case_details_confirmed",
      description: "Case number, court, and response deadline confirmed",
      required: true,
    },
    {
      check: "claims_analyzed",
      description: "Each claim in the summons has been reviewed",
      required: true,
    },
    {
      check: "response_drafted",
      description: "Answer or response to all claims is drafted",
      required: true,
    },
  ],
  grounds: [
    { id: "deny_claim", label: "Deny Claim", description: "Dispute the claim alleged" },
    { id: "legal_defense", label: "Legal Defense", description: "Assert legal defense" },
    { id: "lack_jurisdiction", label: "Lack Jurisdiction", description: "Court lacks jurisdiction" },
  ],
  responseOptions: [
    { id: "answer", label: "File Answer", description: "Respond to each claim" },
    { id: "motion_dismiss", label: "Motion to Dismiss", description: "Challenge court jurisdiction" },
  ],
  outputPackageContents: [
    { item: "Answer addressing all claims", required: true },
    { item: "Affidavit if required by court", required: false },
    { item: "Proof of service documents", required: true },
  ],
} as const

export default courtSummonsResponseDomain
