import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "obligation-value",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/obligation-value",
  startPath: "/secured-transactions/workflows/obligation-value/start",
  title: "Obligation & Value",
  seoTitle: "Obligation & Value | Secured Transactions | MailMyPDF",
  seoDescription: "Identify and document the actual obligation, value given, parties, and supporting records needed for later transaction analysis.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Obligation & Value",
  heroDescription: "Identify and document the actual obligation, value given, parties, and supporting records needed for later transaction analysis.",
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
    ["Obligation Terms", "Records and facts supporting obligation terms."],
    ["Value Evidence", "Records and facts supporting value evidence."],
    ["Obligor And Creditor Roles", "Records and facts supporting obligor and creditor roles."],
    ["Source Conflicts", "Records and facts supporting source conflicts."],
  ],
  outputs: ["Obligation model, value evidence, party-role findings, and deficiency findings."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
