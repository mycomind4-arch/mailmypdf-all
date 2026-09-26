import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "cp2000-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/cp2000-response",
  startPath: "/notice-respond/workflows/cp2000-response/start",
  title: "IRS CP2000 Response",
  seoTitle: "IRS CP2000 Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Respond to an IRS CP2000 proposed adjustment notice with guided discrepancy review, supporting-document organization, response drafting, packet review, and mailing proof.",
  eyebrow: "IRS CP2000 response workflow",
  heroTitle: "Respond to an IRS CP2000 Notice",
  heroDescription: "Start with the actual CP2000 notice, review each income or payment item the IRS says does not match your return, choose whether you agree, disagree, or partially agree, organize supporting records, and review the exact response packet before anything is mailed.",
  heroImage: "/workflow-images/cp2000-response.png",
  heroImageAlt: "IRS CP2000 response workflow",
  heroTone: "dark",
  indexable: true,
  contentStatus: "reviewed",
  discovery: {
    primaryQuestion: "How do I respond to an IRS CP2000 notice?",
    alternateQuestions: [
      "What should I do if I disagree with an IRS CP2000 proposed adjustment?",
      "Can I partially agree with an IRS CP2000 notice?",
      "What documents should I include with a CP2000 response?",
    ],
    agency: "Internal Revenue Service",
    jurisdiction: "United States",
    documentType: "IRS CP2000 proposed-adjustment notice",
  },
  whatYouDo: [
    "Start from the actual CP2000 notice and identify the tax year, printed response date, proposed changes, and each income or payment item the IRS says does not match your return.",
    "Review each proposed item separately instead of treating the notice as one all-or-nothing disagreement.",
    "Record whether you agree, disagree, or partially agree with the proposed changes and connect supporting records to the items they address.",
    "Prepare a factual, itemized response and review the exact packet before any mailing step.",
  ],
  whatYouNeed: [
    "The complete CP2000 notice, including the pages listing the proposed changes, response date, and mailing instructions",
    "Your filed tax return for the year identified on the notice",
    "Relevant W-2s, 1099s, K-1s, broker statements, bank statements, corrected forms, or other records tied to disputed items",
    "Any prior IRS correspondence or payer correspondence about the same income item or tax year",
  ],
  outputs: [
    "A structured response addressing the proposed discrepancies item by item",
    "A reviewed response packet containing the supporting records you choose to include",
    "A confirmed mailing destination taken from your notice rather than a generic IRS address",
    "Tracking and proof retained with the matter after the approved packet is mailed",
  ],
  workspaceHighlights: [
    [
      "Item-by-item discrepancy review",
      "Break the CP2000 into the specific income or payment items the IRS says do not match so each one can be reviewed on its own facts.",
    ],
    [
      "Evidence-connected response",
      "Attach the W-2, 1099, K-1, broker statement, bank record, corrected form, or other document that supports a disputed item.",
    ],
    [
      "Reviewed mailing packet",
      "Generate the response, review the exact draft and attachments, confirm the notice-specific mailing address, then retain tracking and proof.",
    ],
  ],
  workflowSteps: [
    [
      "Upload the CP2000",
      "Add the complete notice you actually received so the workflow can work from the tax year, proposed items, response date, and instructions printed on it.",
    ],
    [
      "Review the discrepancies",
      "Confirm each proposed mismatch and the income or payment source the notice associates with it.",
    ],
    [
      "Choose your position",
      "Record whether you agree, disagree, or partially agree and identify which specific items need supporting evidence.",
    ],
    [
      "Add supporting records",
      "Connect relevant tax forms, broker or bank records, corrected information returns, and prior correspondence to the items they support.",
    ],
    [
      "Build and review the response",
      "Prepare an itemized response, read the draft, review the attached evidence, and correct anything that does not match your records.",
    ],
    [
      "Approve and mail",
      "Confirm the response address from your notice, approve the exact packet, complete the mailing step, and retain tracking and proof.",
    ],
  ],
  readyItems: [
    [
      "Your CP2000 notice",
      "Use the complete notice, especially the pages showing the proposed changes, response date, and IRS mailing instructions.",
    ],
    [
      "Your filed return",
      "Have the tax return for the year referenced by the notice so you can compare what you filed with what the IRS says it received.",
    ],
    [
      "Income and payment records",
      "Gather the W-2s, 1099s, K-1s, broker statements, bank records, corrected forms, or other records relevant to the disputed items.",
    ],
    [
      "Prior correspondence",
      "Include any relevant IRS, employer, bank, broker, or payer correspondence about the same item or tax year.",
    ],
  ],
  faqs: [
    [
      "What is an IRS CP2000 notice?",
      "A CP2000 is a proposed adjustment notice generated when income or payment information reported to the IRS by third parties does not match information on your filed tax return. It identifies proposed changes and gives you an opportunity to respond.",
    ],
    [
      "Is a CP2000 the same as a final tax bill?",
      "No. A CP2000 presents proposed changes. You can review the individual items and respond by agreeing, disagreeing, or partially agreeing based on your records.",
    ],
    [
      "What if I agree with some proposed items but disagree with others?",
      "The workflow is designed for an item-by-item response. You can accept some proposed changes while disputing others and attach supporting records for the items you dispute.",
    ],
    [
      "Will this workflow calculate a different deadline for me?",
      "No. It preserves the response date printed on your notice rather than inventing or calculating a substitute deadline. You should review that printed date carefully.",
    ],
    [
      "What happens if I do not respond?",
      "The IRS may continue the proposed-adjustment process and can later issue a formal notice carrying separate rights and deadlines. This workflow is intended to help you organize and review a timely response to the CP2000 you received.",
    ],
    [
      "Can I review everything before it is mailed?",
      "Yes. The draft, supporting documents, final packet, mailing destination, and approval step remain reviewable before the packet moves to mailing.",
    ],
  ],
  relatedWorkflows: [
    {
      title: "IRS CP14 Response",
      path: "/notice-respond/workflows/cp14-response",
      description: "Use this when the IRS notice is a CP14 balance-due notice rather than a CP2000 proposed-adjustment notice.",
    },
    {
      title: "IRS CP504 Response",
      path: "/notice-respond/workflows/cp504-response",
      description: "Use this when the notice is a CP504 collection notice and you need a workflow built around the facts and instructions printed on that notice.",
    },
    {
      title: "IRS Balance Due Notice Response",
      path: "/notice-respond/workflows/irs-balance-due-notice-response",
      description: "Use this for an IRS balance-due notice that does not match the CP2000 proposed-adjustment workflow.",
    },
  ],
  primaryCtaLabel: "Start CP2000 Response",
  secondaryCtaLabel: "See how it works",
  overview: "The IRS says a CP2000 is a proposed-adjustment notice issued when income or payment information reported by third parties does not match the tax return on file. It is not itself a bill. The notice explains the proposed changes and tells you how and when to respond. This workflow turns the notice into an item-by-item review so your response can match the records you actually have.",
  responseOptions: [
    ["Agree", "Confirm the proposed items you agree with and prepare the response materials the notice asks for."],
    ["Partially agree", "Accept the items that match your records while identifying and documenting the specific items you dispute."],
    ["Disagree", "Identify each proposed item you believe is inaccurate and connect the records that support your position."],
  ],
  commonMistakes: [
    "Treating the proposed amount as a final bill instead of reviewing the individual proposed changes first.",
    "Sending a broad disagreement without identifying each disputed item and why it is wrong.",
    "Waiting for a corrected form without also tracking the response date printed on the notice.",
    "Using a generic IRS mailing address instead of the reply address or submission instructions on the actual CP2000.",
    "Sending original supporting records instead of retaining originals and reviewing exactly what is included in the response packet.",
  ],
  sources: [
    { title: "Understanding your CP2000 series notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/understanding-your-cp2000-series-notice" },
    { title: "Responding to a notice", publisher: "Internal Revenue Service", href: "https://www.irs.gov/individuals/responding-to-a-notice" },
  ],
  disclaimer: "MailMyPDF helps organize your CP2000, disputed items, supporting records, correspondence, and mailing proof. It does not provide tax or legal advice or determine whether an IRS adjustment is correct. Follow the response date and instructions on your own notice.",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
