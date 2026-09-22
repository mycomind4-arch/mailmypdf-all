import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "follow-up-after-notice-submission",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/follow-up-after-notice-submission",
  startPath: "/notice-respond/workflows/follow-up-after-notice-submission/start",
  title: "Follow Up After Notice Submission",
  seoTitle: "Follow Up After Notice Submission | Notice Respond | MailMyPDF",
  seoDescription: "Follow up on submitted notice response with status tracking, confirmation verification, escalation letters, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Follow Up After Submitting Your Response",
  heroDescription: "Track the status of your submitted notice response, verify receipt, prepare follow-up correspondence if needed, review exact documents, and retain all proof of communication.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Confirm receipt of your submitted response with the receiving authority or court.",
    "Track the status of your submission and any acknowledgment or tracking numbers.",
    "Prepare follow-up correspondence if the authority has not confirmed receipt or action.",
    "Document all communications and retain proof of your follow-up efforts.",
  ],
  whatYouNeed: [
    "Mailing tracking number or filing confirmation from your original submission.",
    "Contact information for the receiving authority or court office.",
    "Any response deadline or action timeline referenced in the original notice.",
    "Documentation of any follow-up inquiries or correspondence already sent.",
  ],
  outputs: [
    "Status verification of your original submission.",
    "Follow-up letter if confirmation or action is needed.",
    "A complete record of all submission and follow-up communications.",
    "Retained proof of all tracking, confirmation, and follow-up efforts.",
  ],
  faqs: [
    [
      "How do I know if my response was received?",
      "Check your mailing tracking number if sent by mail, or your filing confirmation if submitted electronically. Contact the receiving office if you haven't received confirmation after the expected timeframe.",
    ],
    [
      "How long does it take to receive confirmation?",
      "Acknowledgment times vary: by mail typically 5-10 business days, by email often the same day, by hand delivery immediately. Government offices may take longer to process.",
    ],
    [
      "What should I do if I don't get confirmation?",
      "Send a follow-up inquiry letter requesting confirmation of receipt. Include your original submission date, tracking number, and copies of any confirmation you have.",
    ],
    [
      "Can I send a follow-up letter?",
      "Yes. This workflow helps you prepare a professional follow-up letter if needed, with all appropriate details and documentation.",
    ],
  ],
  workspaceHighlights: [
    ["Submission verification", "Confirm receipt and status of your submitted response."],
    ["Follow-up coordination", "Prepare follow-up correspondence if needed to confirm action."],
    ["Complete record", "Maintain a record of all submissions and follow-up communications."],
  ],
  workflowSteps: [
    ["Gather submission proof", "Add mailing tracking or filing confirmation from original submission."],
    ["Verify status", "Check with the receiving authority to confirm receipt."],
    ["Prepare follow-up", "Draft follow-up letter if confirmation or action is needed."],
    ["Review and finalize", "Review all communications and confirmation attempts."],
    ["Retain complete record", "Organize and keep all tracking, confirmation, and follow-up proof."],
  ],
  readyItems: [
    ["Original submission proof", "Mailing tracking, filing confirmation, or delivery receipt."],
    ["Receiving authority contact", "Office address, phone, email for follow-up inquiries."],
    ["Original deadline", "Any timeline or action deadline from the original notice."],
    ["Prior follow-up", "Any previous inquiry letters or confirmation attempts."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
