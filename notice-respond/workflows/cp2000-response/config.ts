import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp2000-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp2000-response",
  startPath: "/notice-respond/workflows/cp2000-response/start",
  title: "IRS CP2000 Response",
  seoTitle: "Respond to an IRS CP2000 Notice | MailMyPDF",
  seoDescription: "Review the proposed changes in an IRS CP2000 notice, organize supporting records, choose how you want to respond, prepare a reviewed response packet, and keep a mailing-proof record.",
  eyebrow: "IRS CP2000 response workflow",
  heroTitle: "Respond to an IRS CP2000 Proposed Adjustment Notice",
  heroDescription: "Start with the actual notice. Review the income or payment items the IRS says do not match your return, organize the records that support your position, prepare a response you can review, and keep the final packet and mailing proof together.",
  primaryCtaLabel: "Start My CP2000 Response",
  secondaryCtaLabel: "See How It Works",
  indexable: true,
  contentStatus: "reviewed",
  overview: "A CP2000 is a proposed-adjustment notice the IRS sends when information reported by third parties does not match information on a tax return. It is not itself a bill. Your notice explains the proposed changes and tells you how and when to respond. This workflow helps you work from the actual CP2000, compare the proposed items with your records, document whether you agree or disagree with some or all of the changes, prepare reviewable correspondence and supporting documents, and retain the exact response packet you approved.",
  whatYouDo: [
    "Start from the complete CP2000 notice you actually received instead of a generic IRS response template.",
    "Identify the tax year, response date, proposed changes, payers, information returns, and dollar amounts shown on the notice.",
    "Review each disputed or accepted item against your own W-2, 1098, 1099, K-1, brokerage, bank, tax-return, or other supporting records.",
    "Prepare a source-grounded response packet you can review before choosing whether and how to send it.",
  ],
  whatYouNeed: [
    "The complete CP2000 notice, including the response form and the page showing the IRS reply instructions",
    "Your filed tax return for the year referenced by the notice",
    "The W-2s, 1098s, 1099s, K-1s, broker statements, bank records, or corrected forms relevant to any proposed mismatch",
    "Any prior IRS correspondence or amended return involving the same tax year",
    "Copies of the documents you want included as support for any disagreement",
  ],
  outputs: [
    "A structured record of the proposed CP2000 items and the response position you choose for each issue",
    "A factual response draft grounded in the notice and the information you confirm",
    "A reviewed response packet containing the correspondence and supporting records you chose to include",
    "A retained record of the final packet, recipient instructions, tracking, and mailing proof when you use MailMyPDF fulfillment",
  ],
  workspaceHighlights: [
    ["Item-by-item notice analysis", "Capture the tax year, response date, payer information, proposed amounts, and specific mismatches directly from the CP2000."],
    ["Evidence-grounded response", "Connect each disagreement to the records you provide rather than relying on generic tax-notice language."],
    ["Review before sending", "See the response and supporting packet before any mailing or other consequential action moves forward."],
  ],
  responseOptions: [
    ["Agree with the proposed changes", "If the notice is correct, organize the response form, supporting context, and any payment-related records you want retained with the matter."],
    ["Disagree with some or all changes", "Identify the specific proposed items you dispute and connect each one to the records and explanation you want the IRS to review."],
    ["Need more time or a different next step", "Record the printed response date and the notice instructions so you can decide whether to request more time or take another notice-directed action."],
  ],
  workflowSteps: [
    ["Upload the CP2000", "Add the complete notice so the workflow starts from the actual tax year, proposed changes, response date, and reply instructions."],
    ["Review the extracted details", "Confirm the payers, forms, amounts, tax year, and proposed changes before they are used anywhere else in the workflow."],
    ["Add supporting records", "Upload the tax return, W-2s, 1098s, 1099s, K-1s, broker statements, corrected forms, or other records relevant to the proposed mismatches."],
    ["Choose your response position", "Record whether you agree or disagree with some or all of the proposed changes and add the facts you want reflected in the response."],
    ["Review the draft and packet", "Read and edit the response, confirm the supporting documents, and inspect the exact packet before approval."],
    ["Approve and retain proof", "Approve the final packet, confirm the notice-directed destination, and keep tracking and proof with the matter if you mail through MailMyPDF."],
  ],
  readyItems: [
    ["Complete CP2000 notice", "Include every page, the response form, and the page containing the IRS reply address, upload instructions, fax information, or other response directions."],
    ["Filed return", "Have the tax return for the year referenced by the CP2000 available for comparison."],
    ["Income and payment records", "Gather the forms and statements tied to the specific proposed mismatches, including corrected documents when relevant."],
    ["Supporting correspondence", "Include prior IRS correspondence or payer communications if they help explain a disputed item."],
  ],
  commonMistakes: [
    "Treating the proposed amount as a final bill instead of reviewing the proposed changes and the response instructions.",
    "Responding to only one large discrepancy while overlooking other proposed items listed in the same notice.",
    "Missing the response date printed on the notice while waiting for additional records.",
    "Sending unsupported general disagreement language instead of identifying the specific items and records involved.",
    "Using a generic IRS mailing address instead of following the reply instructions printed on the CP2000.",
    "Failing to keep a copy of the response and supporting documents you actually sent.",
  ],
  faqs: [
    ["What is an IRS CP2000 notice?", "A CP2000 is a proposed-adjustment notice issued when information the IRS received from third parties does not match information reported on a tax return. The IRS says the notice is not itself a bill."],
    ["Do I have to agree with the proposed amount?", "No. The IRS instructs taxpayers to review the proposed changes and indicate whether they agree or disagree. If you disagree with some or all of the changes, you can provide a signed explanation and supporting documentation."],
    ["What if I agree with only part of the notice?", "The workflow lets you identify which proposed items you accept and which items you dispute so your response can address the actual mismatches rather than relying on a single generic statement."],
    ["How long do I have to respond?", "Use the response date printed on your own notice. IRS Topic 652 says CP2000 recipients generally have 30 days from the notice date to respond, or 60 days if they live outside the United States, but the workflow preserves the date printed on the notice rather than calculating a substitute deadline."],
    ["Can I review everything before it is mailed?", "Yes. The response draft, supporting documents, packet approval, payment, and mailing are separate steps. Nothing is mailed through MailMyPDF until you approve the exact packet."],
  ],
  sources: [
    {
      title: "Understanding your CP2000 series notice",
      publisher: "Internal Revenue Service",
      href: "https://www.irs.gov/individuals/understanding-your-cp2000-series-notice",
    },
    {
      title: "Topic no. 652, Notice of underreported income – CP2000",
      publisher: "Internal Revenue Service",
      href: "https://www.irs.gov/taxtopics/tc652",
    },
  ],
  relatedWorkflows: [
    {
      title: "IRS CP14 Response",
      path: "/notice-respond/workflows/cp14-response",
      description: "Use this when the notice is a CP14 balance-due notice rather than a CP2000 proposed-adjustment notice.",
    },
    {
      title: "IRS CP504 Response",
      path: "/notice-respond/workflows/cp504-response",
      description: "Use this for a CP504 Notice of Intent to Levy and its collection-specific response instructions.",
    },
  ],
  disclaimer: "MailMyPDF helps organize documents and prepare reviewable correspondence; it does not provide tax or legal advice or determine whether the IRS proposal is correct. Follow the instructions and response date printed on your notice, and consider a qualified tax professional for complex tax, amended-return, deficiency, or representation questions.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
