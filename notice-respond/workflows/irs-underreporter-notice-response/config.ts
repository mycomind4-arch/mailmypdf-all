import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-underreporter-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-underreporter-notice-response",
  startPath: "/notice-respond/workflows/irs-underreporter-notice-response/start",
  title: "IRS Underreporter Notice Response",
  seoTitle: "IRS Underreporter Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to IRS underreporter notice (CP2000) with supporting evidence, corrected reporting, or protest, exact review, and proof.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "Respond to an IRS Underreporter Notice",
  heroDescription: "Start with the IRS underreporter notice (mismatch with Form 1099), gather supporting documentation, prepare your response or protest, review the exact packet, and retain proof.",
  indexable: true,
  contentStatus: "published",
  whatYouDo: [
    "Start from the actual IRS underreporter notice you received, not a generic template.",
    "Confirm the specific income or item the IRS believes was underreported.",
    "Gather documentation showing what was actually reported on your return.",
    "Prepare a response explaining any discrepancy and review the exact packet before mailing.",
  ],
  whatYouNeed: [
    "The complete IRS underreporter notice (typically CP2000).",
    "Your tax return showing how the item was actually reported.",
    "Form 1099 or other document showing the IRS's information.",
    "Supporting documentation explaining any discrepancy.",
  ],
  outputs: [
    "A response explaining the reported amount and any discrepancy.",
    "A reviewed, exact PDF packet with supporting documentation.",
    "A confirmed response deadline and submission method.",
    "Mailing tracking and proof retained with the matter.",
  ],
  faqs: [
    [
      "What causes an underreporter notice?",
      "The IRS receives information documents (1099s, W-2s, etc.) showing income paid to you, but your return shows different amounts or omits the income. This triggers an automated notice.",
    ],
    [
      "How should I respond?",
      "Explain what you actually reported on your return. If amounts differ, explain why: e.g., income was excluded, corrected on amended return, or belongs to another taxpayer.",
    ],
    [
      "What if I didn't report the income?",
      "If income was genuinely unreported, consider filing an amended return to report it and minimize penalties. Respond to the notice with the amended return.",
    ],
    [
      "What if the document (1099) is wrong?",
      "Request the issuer correct the 1099 and file a corrected Form 1099 with the IRS. Include this in your response to the IRS notice.",
    ],
  ],
  workspaceHighlights: [
    ["Mismatch analysis", "Compare IRS information to what you reported on your return."],
    ["Documentation gathering", "Organize your return and supporting income documents."],
    ["Response preparation", "Build response explaining reported amounts."],
  ],
  workflowSteps: [
    ["Upload the notice", "Add the IRS underreporter notice."],
    ["Review tax return", "Compare your reported income to the 1099 or information document."],
    ["Gather documentation", "Add your return, 1099, and explanatory documents."],
    ["Prepare response", "Explain what was reported and any discrepancy."],
    ["Submit and retain proof", "Approve and mail before deadline, retain proof."],
  ],
  readyItems: [
    ["Underreporter notice", "The complete IRS notice with specific items in question."],
    ["Tax return", "Your return showing how the item was actually reported."],
    ["Form 1099 or document", "The 1099 or information document the IRS received."],
    ["Explanatory documents", "If applicable, documentation of corrected 1099 or explanation."],
  ],
} as const satisfies WorkflowLandingConfig

export default workflowConfig
