import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "pre-filing-lien-priority-search",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/pre-filing-lien-priority-search",
  startPath: "/secured-transactions/workflows/pre-filing-lien-priority-search/start",
  title: "Pre-Filing Lien & Priority Search",
  seoTitle: "Pre-Filing Lien & Priority Search | Secured Transactions | MailMyPDF",
  seoDescription: "Collect and normalize existing UCC records and other supported competing-interest evidence before later priority analysis.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Pre-Filing Lien & Priority Search",
  heroDescription: "Collect and normalize existing UCC records and other supported competing-interest evidence before later priority analysis.",
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
    ["Search Terms", "Records and facts supporting search terms."],
    ["Source Coverage", "Records and facts supporting source coverage."],
    ["Filing Records", "Records and facts supporting filing records."],
    ["Search Limitations", "Records and facts supporting search limitations."],
  ],
  outputs: ["Search plan, normalized competing-interest records, source evidence, and search-completeness findings."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
