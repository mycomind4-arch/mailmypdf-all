import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "attachment-certification",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/attachment-certification",
  startPath: "/secured-transactions/workflows/attachment-certification/start",
  title: "Attachment Certification",
  seoTitle: "Attachment Certification | Secured Transactions | MailMyPDF",
  seoDescription: "Assess whether the available evidence supports the required attachment elements and identify missing or unresolved elements.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Attachment Certification",
  heroDescription: "Assess whether the available evidence supports the required attachment elements and identify missing or unresolved elements.",
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
    ["Value", "Records and facts supporting value."],
    ["Rights In Collateral", "Records and facts supporting rights in collateral."],
    ["Agreement Evidence", "Records and facts supporting agreement evidence."],
    ["Unresolved Elements", "Records and facts supporting unresolved elements."],
  ],
  outputs: ["Attachment assessment, failed-element findings, provenance map, and review decision."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
