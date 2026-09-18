import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "priority-remediation",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/priority-remediation",
  startPath: "/secured-transactions/workflows/priority-remediation/start",
  title: "Priority Remediation",
  seoTitle: "Priority Remediation | Secured Transactions | MailMyPDF",
  seoDescription: "Identify supported corrective steps for defects or maintenance issues while avoiding any action that lacks a legitimate transaction and authorization basis.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Priority Remediation",
  heroDescription: "Identify supported corrective steps for defects or maintenance issues while avoiding any action that lacks a legitimate transaction and authorization basis.",
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
    ["Identified Defect", "Records and facts supporting identified defect."],
    ["Supported Correction", "Records and facts supporting supported correction."],
    ["Authorization", "Records and facts supporting authorization."],
    ["Re-Verification", "Records and facts supporting re-verification."],
  ],
  outputs: ["Remediation plan, required corrections, risk findings, and re-verification requirements."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
