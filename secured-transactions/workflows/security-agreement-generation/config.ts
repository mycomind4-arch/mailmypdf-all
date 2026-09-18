import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "security-agreement-generation",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/security-agreement-generation",
  startPath: "/secured-transactions/workflows/security-agreement-generation/start",
  title: "Security Agreement Generation",
  seoTitle: "Security Agreement Generation | Secured Transactions | MailMyPDF",
  seoDescription: "Prepare a reviewable draft agreement only from verified parties, obligation facts, authority, and sufficiently specific collateral information.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Security Agreement Generation",
  heroDescription: "Prepare a reviewable draft agreement only from verified parties, obligation facts, authority, and sufficiently specific collateral information.",
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
    ["Party Identity", "Records and facts supporting party identity."],
    ["Obligation", "Records and facts supporting obligation."],
    ["Collateral Description", "Records and facts supporting collateral description."],
    ["Execution Review", "Records and facts supporting execution review."],
  ],
  outputs: ["Draft security agreement, source map, validation report, and execution requirements."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
