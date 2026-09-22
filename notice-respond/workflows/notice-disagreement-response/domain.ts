export const noticeDisagreementDomain = {
  workflowId: "notice-disagreement-response",
  name: "Notice Disagreement Response",
  description: "Dispute notice with formal objection and supporting evidence",
  extractionSchemaIds: ["notice-disagreement-analysis"],
  validationRules: [
    { rule: "objection_specific", description: "Objection addresses specific statements", severity: "warning" },
  ],
  readinessChecks: [
    { check: "dispute_identified", description: "Specific disputes identified", required: true },
    { check: "evidence_gathered", description: "Supporting evidence gathered", required: true },
  ],
  grounds: [
    { id: "formal_objection", label: "Formal Objection", description: "Formal objection to notice" },
  ],
  responseOptions: [
    { id: "disagreement_letter", label: "Disagreement Letter", description: "Submit formal disagreement" },
  ],
  outputPackageContents: [
    { item: "Formal disagreement letter with evidence", required: true },
    { item: "Supporting documentation", required: true },
  ],
} as const
export default noticeDisagreementDomain
