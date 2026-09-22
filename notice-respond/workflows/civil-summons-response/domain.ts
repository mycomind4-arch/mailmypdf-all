export const civilSummonsDomain = {
  workflowId: "civil-summons-response",
  name: "Civil Summons Response",
  description: "Respond to civil summons with answer and supporting documents",
  extractionSchemaIds: ["civil-summons-analysis"],
  validationRules: [
    { rule: "response_deadline_not_passed", description: "Response filed before deadline", severity: "error" },
    { rule: "allegations_addressed", description: "Answer addresses all allegations", severity: "warning" },
  ],
  readinessChecks: [
    { check: "summons_reviewed", description: "Summons and complaint reviewed", required: true },
    { check: "court_requirements_confirmed", description: "Court requirements and local rules confirmed", required: true },
    { check: "defenses_identified", description: "Potential defenses identified", required: true },
  ],
  grounds: [
    { id: "deny_allegations", label: "Deny Allegations", description: "Deny the allegations in the complaint" },
    { id: "lack_jurisdiction", label: "Lack of Jurisdiction", description: "Court lacks jurisdiction" },
  ],
  responseOptions: [
    { id: "answer_filing", label: "File Answer", description: "File answer and defenses with the court" },
  ],
  outputPackageContents: [
    { item: "Answer to complaint addressing each allegation", required: true },
    { item: "Supporting documents and evidence of defenses", required: true },
  ],
} as const

export default civilSummonsDomain
