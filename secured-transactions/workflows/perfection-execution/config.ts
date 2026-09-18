import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "perfection-execution",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/perfection-execution",
  startPath: "/secured-transactions/workflows/perfection-execution/start",
  title: "Perfection Execution",
  seoTitle: "Perfection Execution | Secured Transactions | MailMyPDF",
  seoDescription: "Track evidence of a selected perfection act without treating preparation or intent as proof that perfection occurred.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Perfection Execution",
  heroDescription: "Track evidence of a selected perfection act without treating preparation or intent as proof that perfection occurred.",
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
    ["Approved Method", "Records and facts supporting approved method."],
    ["Execution Evidence", "Records and facts supporting execution evidence."],
    ["Receipts", "Records and facts supporting receipts."],
    ["Status", "Records and facts supporting status."],
  ],
  outputs: ["Perfection-event records, receipts or evidence, status findings, and unresolved execution tasks."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
