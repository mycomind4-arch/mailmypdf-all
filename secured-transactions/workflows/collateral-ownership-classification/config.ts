import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "collateral-ownership-classification",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/collateral-ownership-classification",
  startPath: "/secured-transactions/workflows/collateral-ownership-classification/start",
  title: "Collateral Ownership & Classification",
  seoTitle: "Collateral Ownership & Classification | Secured Transactions | MailMyPDF",
  seoDescription: "Identify proposed collateral, determine what evidence supports rights in it, and classify the collateral for later rule analysis.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Collateral Ownership & Classification",
  heroDescription: "Identify proposed collateral, determine what evidence supports rights in it, and classify the collateral for later rule analysis.",
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
    ["Collateral Inventory", "Records and facts supporting collateral inventory."],
    ["Ownership Evidence", "Records and facts supporting ownership evidence."],
    ["Classification", "Records and facts supporting classification."],
    ["Description Scope", "Records and facts supporting description scope."],
  ],
  outputs: ["Collateral inventory, ownership findings, classification findings, and description candidates."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
