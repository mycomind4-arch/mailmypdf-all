/* Domain specification for administrative hearing notice response workflow.
 * Defines business logic, validation rules, and workflow steps for responding
 * to administrative hearing notices.
 */

export const administrativeHearingNoticeResponseDomain = {
  workflowId: "administrative-hearing-notice-response",
  name: "Administrative Hearing Notice Response",
  description: "Response to an administrative hearing notice with evidence organization and deadline tracking",
  extractionSchemaIds: ["administrative-hearing-notice-analysis"],
  validationRules: [
    {
      rule: "hearing_date_must_be_future",
      description: "Hearing date must be in the future",
      severity: "error",
    },
    {
      rule: "deadline_before_hearing",
      description: "Evidence submission deadline must be before the hearing date",
      severity: "error",
    },
    {
      rule: "evidence_supports_position",
      description: "Submitted evidence should be relevant to the hearing issues",
      severity: "warning",
    },
  ],
  readinessChecks: [
    {
      check: "notice_provided",
      description: "Complete administrative hearing notice is provided",
      required: true,
    },
    {
      check: "hearing_date_confirmed",
      description: "Hearing date and time have been confirmed",
      required: true,
    },
    {
      check: "deadline_understood",
      description: "Evidence submission deadline has been noted",
      required: true,
    },
    {
      check: "response_prepared",
      description: "Response or evidence package has been prepared",
      required: true,
    },
    {
      check: "submission_method_verified",
      description: "Correct submission method and address have been verified",
      required: true,
    },
  ],
  grounds: [
    {
      id: "dispute_facts",
      label: "Dispute the Facts",
      description: "The facts alleged in the notice are incorrect or not supported by evidence",
    },
    {
      id: "procedural_violation",
      label: "Procedural Violation",
      description: "The notice was issued in violation of proper procedures",
    },
    {
      id: "lack_of_authority",
      label: "Lack of Authority",
      description: "The agency lacks authority to take the action described in the notice",
    },
    {
      id: "insufficient_evidence",
      label: "Insufficient Evidence",
      description: "The evidence provided is insufficient to support the agency's position",
    },
  ],
  responseOptions: [
    {
      id: "respond_with_evidence",
      label: "Respond with Evidence",
      description: "Submit a response with supporting evidence and documentation",
    },
    {
      id: "request_continuance",
      label: "Request Continuance",
      description: "Request the hearing be postponed to allow more time to prepare",
    },
    {
      id: "request_settlement_conference",
      label: "Request Settlement Conference",
      description: "Request a pre-hearing conference to attempt settlement",
    },
  ],
  outputPackageContents: [
    {
      item: "Response letter addressing the hearing issues",
      required: true,
    },
    {
      item: "Evidence and supporting documentation",
      required: true,
    },
    {
      item: "Submission instructions and deadline confirmation",
      required: true,
    },
  ],
} as const

export default administrativeHearingNoticeResponseDomain
