import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "agency-action-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/agency-action-response",
  startPath: "/notice-respond/workflows/agency-action-response/start",
  title: "Agency Action Response",
  seoTitle: "Agency Action Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a government agency action with guided fact confirmation, objection preparation, evidence organization, document review, and submission proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Government Agency Action",
  heroDescription: "Start with the agency action notice, confirm the action and your rights, gather supporting evidence, prepare your objection or response, review the exact submission, and track delivery.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual agency action notice identifying what action the agency took.",
    "Confirm your rights to object or respond and any deadlines for action.",
    "Gather evidence and facts supporting your objection or alternative response.",
    "Prepare a formal objection letter and review before submitting.",
  ],
  whatYouNeed: [
    "The complete agency action notice explaining what action was taken.",
    "Your rights to object or respond and the deadline to do so.",
    "Supporting evidence, prior correspondence, or documentation.",
    "Contact information for the appropriate agency office.",
  ],
  outputs: [
    "A formal objection or response letter addressing the agency action.",
    "A reviewed, exact submission package with supporting evidence.",
    "Confirmation of the response deadline and submission method.",
    "Proof of submission and tracking information.",
  ],
  faqs: [
    [
      "What types of agency actions can I object to?",
      "Most agency actions permit objections, including benefit denials, permit decisions, licensing actions, and regulatory determinations. Check your notice for objection procedures.",
    ],
    [
      "What should I say in my objection?",
      "Explain specifically why you object, reference relevant regulations or prior decisions, and present evidence supporting your position. Be clear, factual, and respectful.",
    ],
    [
      "What if I miss the response deadline?",
      "Most agencies require responses within specified timeframes. If you miss it, you may lose your right to object. Request an extension immediately if you need more time.",
    ],
  ],
  workspaceHighlights: [
    ["Action analysis", "Identify the agency action and your objection rights."],
    ["Objection preparation", "Gather facts and evidence supporting your position."],
    ["Formal response", "Prepare and submit your objection to the agency."],
  ],
  workflowSteps: [
    ["Review action", "Read the agency action notice and identify your rights."],
    ["Confirm deadline", "Note the deadline for objecting or responding."],
    ["Gather evidence", "Collect facts and documents supporting your objection."],
    ["Draft objection", "Prepare your formal objection letter and attachments."],
    ["Submit response", "File your objection and track confirmation."],
  ],
  readyItems: [
    ["Action notice", "The complete notice of the agency action taken."],
    ["Your rights", "Information on how to object or respond."],
    ["Supporting facts", "Evidence and documentation for your objection."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
