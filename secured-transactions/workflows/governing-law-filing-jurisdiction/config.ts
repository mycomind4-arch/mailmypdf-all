import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "governing-law-filing-jurisdiction",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/governing-law-filing-jurisdiction",
  startPath: "/secured-transactions/workflows/governing-law-filing-jurisdiction/start",
  title: "Governing Law & Filing Jurisdiction",
  seoTitle: "Governing Law & Filing Jurisdiction | Secured Transactions | MailMyPDF",
  seoDescription: "Resolve supported debtor-location facts, governing-law questions, and filing-jurisdiction issues without guessing unsupported rules.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Governing Law & Filing Jurisdiction",
  heroDescription: "Resolve supported debtor-location facts, governing-law questions, and filing-jurisdiction issues without guessing unsupported rules.",
  indexable: false,
  contentStatus: "scaffold",
  workspaceHighlights: [
    ["Evidence-linked inputs", "Material facts remain connected to their source records."],
    ["Deterministic first", "Shared rules and jurisdiction coverage are applied before AI interpretation."],
    ["Review-gated", "Unresolved material issues remain visible and consequential actions stay disabled."],
  ],
  workflowSteps: [
    ["Collect source records", "Add the documents and facts relevant to this workflow."],
    ["Normalize the matter", "Resolve parties, dates, records, and evidence without hiding conflicts."],
    ["Apply supported rules", "Run the shared engines and supported jurisdiction rules for this workflow."],
    ["Review unresolved issues", "Inspect sources, conflicts, missing evidence, and rule-coverage limits."],
    ["Prepare the output", "Create reviewable work product only from supported findings."],
  ],
  readyItems: [
    ["Debtor Location", "Records and facts supporting debtor location."],
    ["Entity Jurisdiction", "Records and facts supporting entity jurisdiction."],
    ["Rule Coverage", "Records and facts supporting rule coverage."],
    ["Filing Office", "Records and facts supporting filing office."],
  ],
  outputs: ["Jurisdiction finding, filing-office finding, governing-law basis, and unresolved-rule flags."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
