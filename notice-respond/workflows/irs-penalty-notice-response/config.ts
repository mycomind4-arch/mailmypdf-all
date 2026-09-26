import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-penalty-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-penalty-notice-response",
  startPath: "/notice-respond/workflows/irs-penalty-notice-response/start",
  title: "IRS Penalty Notice Response",
  seoTitle: "IRS Penalty Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS penalty assessment with reasonable cause claim, penalty abatement request, exact review, and proof retention.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Penalty Assessment",
  heroDescription: "Start with the IRS penalty notice, understand the penalty type and basis, prepare a reasonable cause claim if applicable, review the exact packet, and retain proof of your response.",
  indexable: true,
  contentStatus: "published",
  discovery: {
    primaryQuestion: "How do I respond to an IRS penalty notice?",
    alternateQuestions: [
      "How do I request IRS penalty abatement for reasonable cause?",
      "What documents can support a response to an IRS penalty assessment?",
      "What should I review before responding to an IRS penalty notice?",
    ],
    agency: "Internal Revenue Service",
    jurisdiction: "United States",
    documentType: "IRS penalty assessment notice",
  },
  whatYouDo: [
    "Start from the actual IRS penalty notice you received, not a generic document.",
    "Confirm the penalty type (failure to file, failure to pay, accuracy-related, etc.) and amount.",
    "Evaluate whether you have reasonable cause to request penalty abatement.",
    "Prepare a detailed claim explaining your circumstances and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS penalty notice with penalty type and calculation.",
    "Tax return and payment records for the year with the penalty.",
    "Documentation of your reasonable cause if claiming abatement.",
    "Medical, business, or personal circumstances justifying the penalty.",
  ],
  outputs: [
    "A detailed reasonable cause claim or response to the penalty assessment.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed submission deadline and method before anything is mailed.",
    "Mailing tracking and proof retained with the matter.",
  ],
  faqs: [
    [
      "What is a reasonable cause claim?",
      "A reasonable cause claim is a request to waive an IRS penalty based on your circumstances: medical emergency, business difficulties, reliance on professional advice, or other good faith reasons.",
    ],
    [
      "What documentation should I include?",
      "Include specific facts showing why the penalty is not appropriate: medical records, business records, professional advice documents, or other evidence of your reasonable efforts.",
    ],
    [
      "Can I get a penalty waived?",
      "Yes. If the IRS agrees you had reasonable cause, they can abate (waive) the penalty. The stronger your documentation, the better your chances.",
    ],
    [
      "What if I can't pay the underlying tax plus penalty?",
      "Respond to the penalty notice anyway. Even if you can't pay, your reasonable cause claim may still result in penalty relief.",
    ],
  ],
  workspaceHighlights: [
    ["Penalty analysis", "Understand the penalty type, basis, and reasonable cause options."],
    ["Documentation gathering", "Organize evidence supporting reasonable cause claim."],
    ["Abatement request", "Prepare comprehensive penalty abatement request."],
  ],
  workflowSteps: [
    ["Upload the penalty notice", "Add the IRS penalty assessment."],
    ["Analyze penalty", "Identify penalty type and evaluate reasonable cause."],
    ["Gather documentation", "Collect evidence supporting your circumstances."],
    ["Prepare claim", "Draft detailed reasonable cause claim or response."],
    ["Submit and retain proof", "Approve and mail before deadline, retain proof."],
  ],
  readyItems: [
    ["Penalty notice", "The complete notice with penalty type and amount."],
    ["Tax records", "Tax return and payment records for the penalized year."],
    ["Supporting evidence", "Medical, business, or personal documents supporting your claim."],
    ["Professional advice", "Any professional tax or legal advice relied upon."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
