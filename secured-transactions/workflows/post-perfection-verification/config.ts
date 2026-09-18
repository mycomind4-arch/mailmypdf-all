import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "post-perfection-verification",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/post-perfection-verification",
  startPath: "/secured-transactions/workflows/post-perfection-verification/start",
  title: "Post-Perfection Verification",
  seoTitle: "Post-Perfection Verification | Secured Transactions | MailMyPDF",
  seoDescription: "Compare filing or other perfection evidence against the approved plan, detect defects, and preserve uncertainty for review.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Post-Perfection Verification",
  heroDescription: "Compare filing or other perfection evidence against the approved plan, detect defects, and preserve uncertainty for review.",
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
    ["Acceptance Evidence", "Records and facts supporting acceptance evidence."],
    ["Record Accuracy", "Records and facts supporting record accuracy."],
    ["Defects", "Records and facts supporting defects."],
    ["Verification", "Records and facts supporting verification."],
  ],
  outputs: ["Verification report, defect findings, evidence links, and remediation tasks."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
