import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-notice-response",
  startPath: "/notice-respond/workflows/irs-notice-response/start",
  title: "General IRS Notice Response",
  seoTitle: "General IRS Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to any general IRS notice with guided analysis, action planning, documentation, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Notice",
  heroDescription: "Start with the IRS notice you received, understand the required action and deadline, gather supporting information, prepare your response, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS notice you received, not a generic document.",
    "Understand the specific issue, required action, and response deadline.",
    "Determine the appropriate response: acknowledge, provide information, protest, or pay.",
    "Prepare your response with supporting documentation and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS notice with all details and instructions.",
    "Your tax return(s) for the relevant tax year(s).",
    "Any supporting documentation related to the notice issue.",
    "Prior correspondence or notices about this matter, if any.",
  ],
  outputs: [
    "A response appropriate to the IRS notice and its requirements.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed response deadline and submission method.",
    "Mailing or submission proof retained with the matter.",
  ],
  faqs: [
    [
      "How do I understand what the IRS notice is asking?",
      "Read the notice carefully. Look for: what issue is being addressed, what action is required, what deadline applies, and who to contact with questions.",
    ],
    [
      "What if I don't understand the notice?",
      "The notice will have a phone number for the IRS office that sent it. Contact them to ask for clarification before the deadline.",
    ],
    [
      "Should I respond to every notice?",
      "Most IRS notices require a response or action. Missing a deadline can result in penalties or adverse action. This workflow helps you respond appropriately.",
    ],
    [
      "What if I think the notice is an error?",
      "Explain your position clearly in your response, with supporting documentation. If unresolved, you may have rights to protest or appeal.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Understand the specific issue and required action."],
    ["Response planning", "Determine the appropriate type of response."],
    ["Documentation assembly", "Gather supporting information and submit on time."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS notice you received."],
    ["Analyze and understand", "Identify the issue, required action, and deadline."],
    ["Gather information", "Collect supporting documentation as needed."],
    ["Prepare response", "Draft your response appropriate to the notice type."],
    ["Submit and retain proof", "Approve and mail/submit before deadline, retain proof."],
  ],
  readyItems: [
    ["IRS notice", "The complete notice with all instructions and deadline."],
    ["Tax return", "Tax return(s) for the relevant tax year."],
    ["Supporting documentation", "Any records or information the notice requests."],
    ["Prior correspondence", "Previous notices or letters about this issue."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
