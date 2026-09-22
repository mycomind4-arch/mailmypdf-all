import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "civil-summons-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/civil-summons-response",
  startPath: "/notice-respond/workflows/civil-summons-response/start",
  title: "Civil Summons Response",
  seoTitle: "Civil Summons Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to a civil summons with guided analysis, fact confirmation, supporting documents, answer preparation, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to a Civil Summons",
  heroDescription: "Start with the actual civil summons you received, confirm the deadline and court requirements, gather supporting evidence, prepare your answer, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual civil summons and complaint you received, not a generic template.",
    "Confirm the response deadline, court name, case number, and any procedural requirements.",
    "Gather relevant supporting documents and facts that address the allegations in the complaint.",
    "Prepare a factual answer grounded in your evidence and review the exact packet before filing.",
  ],
  whatYouNeed: [
    "The complete civil summons and complaint with all court information and deadlines.",
    "The court's local rules, forms, and filing requirements.",
    "Relevant documents, evidence, or records that support your answer or defenses.",
    "Any prior correspondence related to the legal dispute.",
  ],
  outputs: [
    "A factual answer drafted only from the summons and your confirmed facts.",
    "A reviewed, exact PDF packet with supporting documents you chose to include.",
    "A confirmed filing deadline and method before anything is submitted to the court.",
    "Filing confirmation and proof retained with the matter after filing.",
  ],
  faqs: [
    [
      "What is a civil summons?",
      "A civil summons is a court document notifying you that a lawsuit has been filed against you. It includes the complaint (the allegations) and the deadline to respond, typically 20-30 days from service.",
    ],
    [
      "What is an answer to a civil summons?",
      "An answer is your formal response to the complaint. You admit, deny, or state insufficient knowledge of each allegation, and you can assert any available defenses.",
    ],
    [
      "What happens if I don't respond to a summons?",
      "If you don't respond by the deadline, the court may enter a default judgment against you, which can result in damages awarded without a hearing.",
    ],
    [
      "Can I respond without an attorney?",
      "Yes. Many people respond to civil summons without an attorney. This workflow helps you prepare a professional, complete response.",
    ],
  ],
  workspaceHighlights: [
    ["Summons analysis", "Extract court information, case number, and response deadline from the summons."],
    ["Evidence organization", "Gather facts and documents that support your answer and defenses."],
    ["Answer preparation", "Build and review your complete answer and supporting packet before filing."],
  ],
  workflowSteps: [
    ["Upload the summons", "Add the civil summons and complaint you received."],
    ["Analyze court requirements", "Review the extracted deadline, court, case number, and local rules."],
    ["Organize your evidence", "Add documents and facts that support your answer or defenses."],
    ["Build and review", "Prepare your answer and supporting packet, then review all documents."],
    ["File and retain proof", "Approve and file before the deadline, retain filing confirmation."],
  ],
  readyItems: [
    ["Civil summons", "The complete summons with court information, case number, and deadline."],
    ["Complaint", "The full complaint with all allegations and claims against you."],
    ["Court local rules", "The court's procedural rules and answer requirements."],
    ["Supporting evidence", "Documents or facts that support your answer or any defenses."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
