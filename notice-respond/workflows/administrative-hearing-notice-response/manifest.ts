/* Manifest for administrative hearing notice response workflow.
 * This workflow responds to administrative hearing notices with guided
 * analysis, evidence organization, and submission tracking.
 */

export const administrativeHearingManifest = {
  workflowId: "administrative-hearing-notice-response",
  workflowName: "Administrative Hearing Notice Response",
  workflowType: "notice-response",
  category: "legal-notice",
  version: "1.0",
  description: "Respond to administrative hearing notices with evidence organization and deadline tracking",
} as const

export default administrativeHearingManifest
