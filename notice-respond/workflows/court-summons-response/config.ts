import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "court-summons-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/court-summons-response",
  startPath: "/notice-respond/workflows/court-summons-response/start",
  title: "Court Summons Response",
  seoTitle: "Court Summons Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a court summons with guided analysis, answer preparation, evidence organization, document review, and court-compliant filing preparation.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Court Summons",
  heroDescription: "Start with the actual summons, confirm the court details and deadline, organize your response facts and evidence, prepare court-compliant documents, review the exact filing, and track submission.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual court summons you received, not a generic court form.",
    "Confirm the court name, case number, defendant name, and response deadline.",
    "Gather facts and evidence relevant to your defense or response.",
    "Prepare legally sound, factual responses and review the exact court documents before filing.",
  ],
  whatYouNeed: [
    "The complete court summons with case number, court name, and response deadline.",
    "Facts related to your defense or response to the claims alleged.",
    "Supporting evidence, correspondence, or documentation relevant to the case.",
    "Your current contact information and any representation details.",
  ],
  outputs: [
    "A court-compliant answer or response addressing the claims in the summons.",
    "A reviewed, exact PDF packet formatted for court filing.",
    "Confirmation of the filing deadline and court filing procedures.",
    "Filing tracking and proof of service retained with your court records.",
  ],
  faqs: [
    [
      "What is a court summons?",
      "A court summons is a legal notice that you are being sued and must respond to the court. It includes the case number, court name, claims against you, and a deadline to respond (usually 20-30 days).",
    ],
    [
      "What happens if I don't respond?",
      "If you don't respond by the deadline, the court may enter a default judgment against you, which means you lose the case without being heard. Meeting the response deadline is critical.",
    ],
    [
      "What should my answer include?",
      "Your answer should respond to each claim in the summons by admitting, denying, or stating you lack knowledge of each allegation. You can also include any legal defenses you have.",
    ],
    [
      "Can I file electronically?",
      "Many courts now allow electronic filing. Check your court's website for e-filing procedures. This workflow prepares documents you can print or e-file based on your court's rules.",
    ],
  ],
  workspaceHighlights: [
    ["Summons-first analysis", "Extract case number, court details, claims, and response deadline from the summons."],
    ["Response organization", "Organize your defenses and evidence relevant to each claim."],
    ["Court-compliant filing", "Draft, review, format, and prepare your answer for court filing."],
  ],
  workflowSteps: [
    ["Upload the summons", "Add the court summons you received."],
    ["Analyze details", "Review the extracted case number, claims, and response deadline."],
    ["Prepare response", "Draft responses to each claim and organize supporting facts."],
    ["Format and review", "Prepare the answer in court-required format and review the exact filing."],
    ["File with court", "Submit your answer before the deadline and retain filing proof."],
  ],
  readyItems: [
    ["Court summons", "The complete summons with case number, court name, and deadline."],
    ["Case facts", "Facts and information responding to each claim in the summons."],
    ["Supporting evidence", "Documents or correspondence supporting your defense or response."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
