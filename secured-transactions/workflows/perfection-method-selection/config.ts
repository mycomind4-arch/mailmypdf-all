import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "perfection-method-selection",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/perfection-method-selection",
  startPath: "/secured-transactions/workflows/perfection-method-selection/start",
  title: "Perfection Method Selection",
  seoTitle: "Perfection Method Selection | Secured Transactions | MailMyPDF",
  seoDescription: "Compare supported perfection methods for the identified collateral and jurisdiction while leaving unsupported questions unresolved.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Perfection Method Selection",
  heroDescription: "Compare supported perfection methods for the identified collateral and jurisdiction while leaving unsupported questions unresolved.",
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
    ["Collateral Class", "Records and facts supporting collateral class."],
    ["Jurisdiction", "Records and facts supporting jurisdiction."],
    ["Method Selection", "Records and facts supporting method selection."],
    ["Exceptions", "Records and facts supporting exceptions."],
  ],
  outputs: ["Perfection plan, method-by-collateral matrix, required actions, and exception findings."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
