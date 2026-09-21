import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "secured-transaction-eligibility",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/secured-transaction-eligibility",
  startPath: "/secured-transactions/workflows/secured-transaction-eligibility/start",
  title: "Secured-Transaction Eligibility",
  seoTitle: "Secured-Transaction Eligibility | Secured Transactions | MailMyPDF",
  seoDescription: "Determine whether the available facts describe a legitimate secured transaction and identify missing elements before attachment, perfection, or priority analysis.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Secured-Transaction Eligibility",
  heroDescription: "Describe your transaction in everyday language, identify the people and property involved, and build a clear checklist of records and questions for review.",
  indexable: false,
  contentStatus: "scaffold",
  workspaceHighlights: [
    ["Guided questions", "Separate the people, obligation, value, property, and agreements without needing legal terminology."],
    ["Honest uncertainty", "Unknown, proposed, and disputed details stay visible. Your answers are not treated as verified evidence."],
    ["Keep a draft", "Download and reopen your answers locally. Account saving and document uploads are not connected yet."],
  ],
  workflowSteps: [
    ["Describe your situation", "Explain what is happening and how you are involved."],
    ["Identify the people", "Separate the person who owes, the property provider, the lender, and the signer."],
    ["Describe the exchange and property", "Record what is owed, what was provided, and the property being offered."],
    ["List agreements and records", "Describe agreements, permission, and records to gather; these are not uploaded files."],
    ["Review and keep your intake", "See open questions and download a draft or readable summary."],
  ],
  readyItems: [
    ["Transaction Basis", "Records and facts supporting transaction basis."],
    ["Obligation And Value", "Records and facts supporting obligation and value."],
    ["Collateral Rights", "Records and facts supporting collateral rights."],
    ["Authorization", "Records and facts supporting authorization."],
  ],
  outputs: ["User-reported transaction summary, open-question checklist, and a downloadable draft. No legal eligibility decision."],
  faqs: [
    ["What can I use now?", "The guided intake and review checklist are available in the authenticated workspace. You can download and reopen a draft; account saving and document verification are not yet connected."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. This intake never authorizes a filing, mailing, payment, or other consequential action."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
