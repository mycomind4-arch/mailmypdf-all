import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "amendment-continuation-assignment-termination",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/amendment-continuation-assignment-termination",
  startPath: "/secured-transactions/workflows/amendment-continuation-assignment-termination/start",
  title: "Amendment / Continuation / Assignment / Termination",
  seoTitle: "Amendment / Continuation / Assignment / Termination | Secured Transactions | MailMyPDF",
  seoDescription: "Manage later lifecycle actions for an existing supported transaction record with authorization and rule checks.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Amendment / Continuation / Assignment / Termination",
  heroDescription: "Manage later lifecycle actions for an existing supported transaction record with authorization and rule checks.",
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
    ["Existing Record", "Records and facts supporting existing record."],
    ["Requested Lifecycle Action", "Records and facts supporting requested lifecycle action."],
    ["Authorization", "Records and facts supporting authorization."],
    ["Rule Coverage", "Records and facts supporting rule coverage."],
  ],
  outputs: ["Lifecycle action plan, prepared lifecycle data, authorization findings, and audit trail."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
