/* Extraction schema for benefits denial notices */

export const benefitsNoticeExtractionSchema = {
  schemaId: "benefits-notice-analysis",
  schemaVersion: "1.0",
  noticeType: "benefits_denial_notice",
  extractionFields: {
    benefitType: {
      description: "Type of benefit (Social Security, Disability, Unemployment, SNAP, etc.)",
      required: true,
      dataType: "string",
    },
    denialReason: {
      description: "Specific reason benefits were denied",
      required: true,
      dataType: "string",
    },
    appealDeadline: {
      description: "Date by which appeal must be submitted",
      required: true,
      dataType: "date",
    },
    appealMethod: {
      description: "How to submit appeal (mail, electronic, in-person)",
      required: true,
      dataType: "string",
    },
    appealAddress: {
      description: "Address where appeal should be submitted",
      required: false,
      dataType: "string",
    },
    agencyName: {
      description: "Name of the benefits agency",
      required: true,
      dataType: "string",
    },
    caseNumber: {
      description: "Case or claim number",
      required: false,
      dataType: "string",
    },
  },
  instructions: "Extract the benefit type, denial reason, and appeal deadline from the benefits denial notice.",
  examples: [
    {
      field: "benefitType",
      example: "Social Security Disability Insurance (SSDI)",
    },
    {
      field: "denialReason",
      example: "Condition does not meet severity requirements for disability",
    },
    {
      field: "appealDeadline",
      example: "December 20, 2024",
    },
  ],
} as const

export default benefitsNoticeExtractionSchema
