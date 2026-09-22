import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "notice-disagreement-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/notice-disagreement-response",
  startPath: "/notice-respond/workflows/notice-disagreement-response/start",
  title: "Notice Disagreement Response",
  seoTitle: "Notice Disagreement Response | Notice Respond | MailMyPDF",
  seoDescription: "Dispute or disagree with a notice with guided analysis, evidence gathering, formal objection preparation, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Dispute or Disagree with a Notice",
  heroDescription: "Start with the notice you disagree with, gather supporting evidence and facts, prepare a detailed objection, review the exact packet, and retain proof of your dispute.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual notice you disagree with, not a generic response.",
    "Identify the specific statements or determinations you dispute.",
    "Gather all supporting evidence, facts, and documentation contradicting the notice.",
    "Prepare a detailed disagreement letter with evidence and review the exact packet before submitting.",
  ],
  whatYouNeed: [
    "The complete notice stating what you disagree with.",
    "Specific facts, documents, or evidence contradicting the notice.",
    "Any prior correspondence related to the matter in the notice.",
    "Documentation supporting your position or alternative facts.",
  ],
  outputs: [
    "A detailed letter of disagreement with supporting evidence.",
    "A reviewed, exact PDF packet with all supporting documentation.",
    "A confirmed submission deadline and method before anything is sent.",
    "Submission proof retained with the matter.",
  ],
  faqs: [
    [
      "How do I formally object to a notice?",
      "Write a detailed letter explaining specifically what you disagree with and why. Support your disagreement with facts, documents, and evidence.",
    ],
    [
      "Should I contact the issuing authority first?",
      "You can try contacting them to resolve informally, but a written formal objection is stronger and creates a record of your disagreement.",
    ],
    [
      "What if the notice issuer doesn't agree with my disagreement?",
      "A formal objection typically preserves your rights to appeal or escalate to a higher authority for reconsideration.",
    ],
    [
      "How should I submit my disagreement?",
      "Follow any submission instructions in the notice. If none are provided, submit via certified mail to the address that sent the notice.",
    ],
  ],
  workspaceHighlights: [
    ["Dispute analysis", "Identify specific points of disagreement with the notice."],
    ["Evidence gathering", "Organize facts and documents contradicting the notice."],
    ["Objection preparation", "Build detailed formal disagreement letter."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the notice you disagree with."],
    ["Identify disputes", "Specify what you disagree with in the notice."],
    ["Gather evidence", "Add facts and documents supporting your position."],
    ["Draft objection", "Prepare detailed letter disagreeing with the notice."],
    ["Submit and retain proof", "Approve and send before any deadline, retain proof."],
  ],
  readyItems: [
    ["Notice", "The complete notice you are disagreeing with."],
    ["Supporting evidence", "Facts, documents, or evidence contradicting the notice."],
    ["Prior correspondence", "Related letters or communications about this matter."],
    ["Legal basis", "Any legal authority supporting your disagreement."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
