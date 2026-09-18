import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "ucc1-preparation-authorization",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/ucc1-preparation-authorization",
  startPath: "/secured-transactions/workflows/ucc1-preparation-authorization/start",
  title: "UCC-1 Preparation & Authorization",
  seoTitle: "UCC-1 Preparation & Authorization | Secured Transactions | MailMyPDF",
  seoDescription: "Prepare reviewable financing-statement data only after the workflow has a supported transaction basis, controlling debtor-name analysis, jurisdiction, and authorization.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "UCC-1 Preparation & Authorization",
  heroDescription: "Prepare reviewable financing-statement data only after the workflow has a supported transaction basis, controlling debtor-name analysis, jurisdiction, and authorization.",
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
    ["Debtor Name", "Records and facts supporting debtor name."],
    ["Secured-Party Data", "Records and facts supporting secured-party data."],
    ["Collateral Indication", "Records and facts supporting collateral indication."],
    ["Authorization", "Records and facts supporting authorization."],
  ],
  outputs: ["UCC-1 data model, draft filing data, authorization finding, debtor-name validation, and filing checklist."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
