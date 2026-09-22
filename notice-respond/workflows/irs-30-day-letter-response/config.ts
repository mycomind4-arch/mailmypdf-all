import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-30-day-letter-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-30-day-letter-response",
  startPath: "/notice-respond/workflows/irs-30-day-letter-response/start",
  title: "IRS 30-Day Letter Response",
  seoTitle: "IRS 30-Day Letter Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS 30-day letter with protest or payment decision, guided analysis, documentation preparation, exact review, and mailing proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to IRS 30-Day Letter",
  heroDescription: "Start with the IRS 30-day letter, confirm your protest rights and deadline, gather supporting evidence, prepare your protest or payment decision, review the exact packet, and retain mailing proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS 30-day letter you received, not a generic template.",
    "Confirm the audit findings, proposed adjustments, and your right to protest.",
    "Gather supporting evidence, documentation, and legal arguments for your protest.",
    "Decide whether to protest or accept the proposed adjustments, prepare your response, and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS 30-day letter with audit findings and proposed adjustments.",
    "All documentation supporting your tax return positions.",
    "Any prior correspondence or evidence from the IRS examination.",
    "Legal or tax authority support for your positions if protesting.",
  ],
  outputs: [
    "A detailed protest statement addressing the IRS adjustments or acceptance letter.",
    "A reviewed, exact PDF packet with supporting documentation and legal arguments.",
    "A confirmed submission deadline and method before anything is mailed.",
    "Mailing tracking and proof retained with the matter after it ships.",
  ],
  faqs: [
    [
      "What is a 30-day letter?",
      "The 30-day letter is an IRS Notice of Proposed Adjustments at the end of an examination. It gives you 30 days to protest to IRS Appeals or accept the findings.",
    ],
    [
      "Can I protest the IRS adjustments?",
      "Yes. You have the right to submit a written protest to IRS Appeals within 30 days of the letter. This is your opportunity to present your case to an independent appeals officer.",
    ],
    [
      "What should my protest include?",
      "Your protest should clearly state which findings you disagree with and present factual and legal arguments for your positions. Include supporting evidence and documentation.",
    ],
    [
      "What if I don't protest?",
      "If you don't respond to the 30-day letter, you generally accept the proposed adjustments, which become a formal deficiency notice.",
    ],
  ],
  workspaceHighlights: [
    ["Examination review", "Extract audit findings and proposed adjustments from the letter."],
    ["Evidence organization", "Gather supporting evidence and legal arguments for protest."],
    ["Protest preparation", "Build and review your complete protest or acceptance response."],
  ],
  workflowSteps: [
    ["Upload the 30-day letter", "Add the IRS notice of proposed adjustments."],
    ["Review adjustments", "Analyze the specific adjustments the IRS is proposing."],
    ["Organize evidence", "Add supporting documentation and legal arguments."],
    ["Prepare protest or decision", "Decide whether to protest and prepare your response."],
    ["Submit and retain proof", "Approve and mail before the deadline, retain mailing proof."],
  ],
  readyItems: [
    ["30-day letter", "The complete IRS notice with audit findings and deadline."],
    ["Tax documentation", "All records and evidence supporting your tax return positions."],
    ["Legal authority", "Citations or precedent for any positions you are protesting."],
    ["Prior correspondence", "Any prior IRS examination correspondence or documents."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
