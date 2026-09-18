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
  heroDescription: "Determine whether the available facts describe a legitimate secured transaction and identify missing elements before attachment, perfection, or priority analysis.",
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
    ["Transaction Basis", "Records and facts supporting transaction basis."],
    ["Obligation And Value", "Records and facts supporting obligation and value."],
    ["Collateral Rights", "Records and facts supporting collateral rights."],
    ["Authorization", "Records and facts supporting authorization."],
  ],
  outputs: ["Eligibility finding, missing-element findings, transaction classification, and remediation path."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
