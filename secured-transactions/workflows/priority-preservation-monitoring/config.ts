import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "priority-preservation-monitoring",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/priority-preservation-monitoring",
  startPath: "/secured-transactions/workflows/priority-preservation-monitoring/start",
  title: "Priority Preservation & Monitoring",
  seoTitle: "Priority Preservation & Monitoring | Secured Transactions | MailMyPDF",
  seoDescription: "Track continuation windows, debtor or collateral changes, new records, lapse risks, and other events that may require review.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Priority Preservation & Monitoring",
  heroDescription: "Track continuation windows, debtor or collateral changes, new records, lapse risks, and other events that may require review.",
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
    ["Continuation Dates", "Records and facts supporting continuation dates."],
    ["Change Events", "Records and facts supporting change events."],
    ["New Filings", "Records and facts supporting new filings."],
    ["Maintenance", "Records and facts supporting maintenance."],
  ],
  outputs: ["Monitoring schedule, alerts, continuation deadlines, change findings, and maintenance tasks."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
