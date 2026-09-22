/* Extraction schema for administrative hearing notices.
 * Defines what information should be extracted from hearing notices
 * to guide the response workflow.
 */

export const administrativeHearingNoticeExtractionSchema = {
  schemaId: "administrative-hearing-notice-analysis",
  schemaVersion: "1.0",
  noticeType: "administrative_hearing_notice",
  extractionFields: {
    hearingDate: {
      description: "The date and time of the administrative hearing",
      required: true,
      dataType: "datetime",
    },
    hearingLocation: {
      description: "The location where the hearing will be held",
      required: true,
      dataType: "string",
    },
    deadline: {
      description: "The deadline for submitting evidence or response",
      required: true,
      dataType: "date",
    },
    submissionMethod: {
      description: "How and where to submit response or evidence (mail, electronic, in-person)",
      required: true,
      dataType: "string",
    },
    submissionAddress: {
      description: "The address where response or evidence should be submitted",
      required: false,
      dataType: "string",
    },
    agencyName: {
      description: "The name of the administrative agency holding the hearing",
      required: true,
      dataType: "string",
    },
    hearingOfficer: {
      description: "Name of the hearing officer or administrative judge",
      required: false,
      dataType: "string",
    },
    matterDescription: {
      description: "Brief description of the administrative matter",
      required: true,
      dataType: "string",
    },
    rights: {
      description: "Your rights in the administrative hearing process",
      required: false,
      dataType: "string",
    },
  },
  instructions: "Extract the key dates, locations, deadlines, and submission procedures from the administrative hearing notice.",
  examples: [
    {
      field: "hearingDate",
      example: "December 15, 2024 at 10:00 AM",
    },
    {
      field: "deadline",
      example: "December 8, 2024",
    },
  ],
} as const

export default administrativeHearingNoticeExtractionSchema
