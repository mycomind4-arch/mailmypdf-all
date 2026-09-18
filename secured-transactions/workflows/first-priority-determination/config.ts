import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "first-priority-determination",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/first-priority-determination",
  startPath: "/secured-transactions/workflows/first-priority-determination/start",
  title: "First-Priority Determination",
  seoTitle: "First-Priority Determination | Secured Transactions | MailMyPDF",
  seoDescription: "Analyze a supported perfected-interest record against known competing claims and supported priority rules without promising blanket first-lien status.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "First-Priority Determination",
  heroDescription: "Analyze a supported perfected-interest record against known competing claims and supported priority rules without promising blanket first-lien status.",
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
    ["Competing Interests", "Records and facts supporting competing interests."],
    ["Supported Priority Rules", "Records and facts supporting supported priority rules."],
    ["Exceptions", "Records and facts supporting exceptions."],
    ["Confidence", "Records and facts supporting confidence."],
  ],
  outputs: ["Priority assessment, competing-claim matrix, exception analysis, confidence, and review requirements."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
