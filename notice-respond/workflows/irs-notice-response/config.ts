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
  seoDescription: "Organize a general IRS notice, verify its specific instructions and printed dates, review evidence and retain submission proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Notice",
  heroDescription: "Start with the actual IRS notice, check whether it requires a response, verify the printed instructions and dates, and review any proposed packet before mailing.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS notice you received, not a generic document.",
    "Identify whether action is requested and confirm the notice-specific instructions and printed dates; do not assume every notice requires a reply.",
    "If action is required, determine the notice-specific response channel and any formal appeal process separately from general correspondence.",
    "Prepare your response with supporting documentation and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS notice with all details and instructions.",
    "Your tax return(s) for the relevant tax year(s).",
    "Any supporting documentation related to the notice issue.",
    "Prior correspondence or notices about this matter, if any.",
  ],
  outputs: [
    "A draft based on the notice and facts you confirm, only when a response is appropriate.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "Notice-specific dates and submission instructions presented for your verification, not a calculated or guaranteed deadline.",
    "Mailing or submission proof retained with the matter.",
  ],
  faqs: [
    [
      "How do I understand what the IRS notice is asking?",
      "Read the notice carefully. Identify the issue, whether the notice requires action, whether a response deadline is stated, and who to contact with questions.",
    ],
    [
      "What if I don't understand the notice?",
      "Use the contact information on the notice to ask the IRS for clarification promptly, especially if the notice specifies a response deadline. Do not assume a deadline or extension from general guidance.",
    ],
    [
      "Should I respond to every notice?",
      "Not every IRS notice requires a reply. The IRS says you generally do not need to reply when you agree unless the notice specifically asks you to. Follow the instructions on the notice, including any formal appeal requirements.",
    ],
    [
      "What if I think the notice is an error?",
      "Check the notice-specific disagreement instructions and whether a required form or formal appeal applies. A general response letter may not preserve appeal rights; follow the stated procedure and include supporting documentation when appropriate.",
    ],
  ],
  workspaceHighlights: [
    ["Notice analysis", "Understand the specific issue and required action."],
    ["Response planning", "Determine the appropriate type of response."],
    ["Documentation assembly", "Gather supporting information and submit on time."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS notice you received."],
    ["Analyze and understand", "Identify whether a response is required, preserve the printed dates, and check the notice-specific submission instructions."],
    ["Gather information", "Collect supporting documentation as needed."],
    ["Prepare response", "Draft your response appropriate to the notice type."],
    ["Submit and retain proof", "Review and approve any required response and retain proof of the actual submission method; do not assume mailing alone preserves appeal rights."],
  ],
  readyItems: [
    ["IRS notice", "The complete notice with all instructions and any printed deadline."],
    ["Tax return", "Tax return(s) for the relevant tax year."],
    ["Supporting documentation", "Any records or information the notice requests."],
    ["Prior correspondence", "Previous notices or letters about this issue."],
  ],
  sources: [
    { title: "Understanding your IRS notice or letter", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter" },
    { title: "Tax relief in disaster situations", publisher: "Internal Revenue Service", href: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations" },
  ],
  disclaimer: "Not all IRS notices require a response. Relief for disasters or other special circumstances does not automatically extend every notice response or appeal deadline. Confirm the applicable taxpayer, act, notice, instructions, and current IRS guidance before relying on relief. A general letter does not replace a required IRS form or formal appeal.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
