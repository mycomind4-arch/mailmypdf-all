import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "unemployment-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/unemployment-notice-response",
  startPath: "/notice-respond/workflows/unemployment-notice-response/start",
  title: "Unemployment Notice Response",
  seoTitle: "Unemployment Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to unemployment notice (claim denial, appeal, protest) with supporting evidence, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an Unemployment Notice",
  heroDescription: "Start with the unemployment notice, understand the issue (claim denied, overpayment, etc.), gather supporting evidence, prepare your response or appeal, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual unemployment notice you received, not a template.",
    "Understand the specific unemployment issue: claim denial, overpayment, appeal, or other action.",
    "Gather supporting documentation: employment records, separation details, or evidence of eligibility.",
    "Prepare a detailed response or appeal and review the exact packet before submitting.",
  ],
  whatYouNeed: [
    "The complete unemployment notice with specific issue and deadline.",
    "Employment records: W-2s, pay stubs, employment letters.",
    "Documentation of separation: termination letter, resignation letter, or information.",
    "Evidence of job search efforts or training if applicable.",
  ],
  outputs: [
    "Response or appeal letter addressing the unemployment issue.",
    "A reviewed, exact PDF packet with supporting employment documentation.",
    "A confirmed response deadline and submission method.",
    "Submission confirmation and proof retained with the matter.",
  ],
  faqs: [
    [
      "What causes an unemployment claim to be denied?",
      "Common reasons: you were terminated for cause, you quit, you didn't meet eligibility requirements, or there's a wage issue.",
    ],
    [
      "Can I appeal an unemployment claim denial?",
      "Yes. You have a right to appeal. Most unemployment systems have strict appeal deadlines (typically 10-30 days). This workflow ensures you meet them.",
    ],
    [
      "What should my appeal include?",
      "Clearly explain why you believe you are eligible. Provide employment records, documentation of your separation, and any evidence showing you meet all requirements.",
    ],
    [
      "What if I received overpayment notice?",
      "Respond promptly explaining your position. You may have a right to request relief from repayment if there was agency error or other circumstances.",
    ],
  ],
  workspaceHighlights: [
    ["Issue analysis", "Understand the specific unemployment claim issue."],
    ["Evidence gathering", "Organize employment records and separation documentation."],
    ["Appeal preparation", "Build detailed appeal or response to unemployment notice."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the unemployment notice you received."],
    ["Analyze issue", "Identify the specific unemployment claim issue."],
    ["Gather employment records", "Add W-2s, pay stubs, and separation documentation."],
    ["Prepare appeal", "Draft appeal or response to the unemployment notice."],
    ["Submit and retain proof", "Approve and submit before deadline, retain proof."],
  ],
  readyItems: [
    ["Unemployment notice", "The complete notice with issue and deadline."],
    ["Employment records", "W-2s, pay stubs, or employment documentation."],
    ["Separation details", "Termination letter, resignation letter, or separation date."],
    ["Job search documentation", "If required, proof of job search or training."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
