/* Extraction schema for court summons */

export const courtSummonsExtractionSchema = {
  schemaId: "court-summons-analysis",
  schemaVersion: "1.0",
  noticeType: "court_summons",
  extractionFields: {
    courtName: {
      description: "Name of the court issuing the summons",
      required: true,
      dataType: "string",
    },
    caseNumber: {
      description: "Case number assigned by the court",
      required: true,
      dataType: "string",
    },
    plaintiff: {
      description: "Name of the party suing (plaintiff)",
      required: true,
      dataType: "string",
    },
    defendant: {
      description: "Name of the defendant (party being sued)",
      required: true,
      dataType: "string",
    },
    responseDeadline: {
      description: "Date by which answer must be filed",
      required: true,
      dataType: "date",
    },
    claims: {
      description: "List of claims alleged in the complaint",
      required: true,
      dataType: "string",
    },
    courtAddress: {
      description: "Address where documents must be filed",
      required: true,
      dataType: "string",
    },
    filingMethod: {
      description: "How to file (in-person, mail, electronic)",
      required: false,
      dataType: "string",
    },
  },
  instructions: "Extract the court details, case number, plaintiff, defendant, claims, and response deadline from the court summons.",
  examples: [
    {
      field: "caseNumber",
      example: "2024-CV-123456",
    },
    {
      field: "responseDeadline",
      example: "January 15, 2025",
    ],
  ],
} as const

export default courtSummonsExtractionSchema
