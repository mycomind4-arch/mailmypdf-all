import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "priority-strategy",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/priority-strategy",
  startPath: "/secured-transactions/workflows/priority-strategy/start",
  title: "Priority Strategy",
  seoTitle: "Priority Strategy | Secured Transactions | MailMyPDF",
  seoDescription: "Organize supported perfection and priority considerations against known competing interests while preserving uncertainty and exceptions for review.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Priority Strategy",
  heroDescription: "Organize supported perfection and priority considerations against known competing interests while preserving uncertainty and exceptions for review.",
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
    ["Known Interests", "Records and facts supporting known interests."],
    ["Supported Rule Paths", "Records and facts supporting supported rule paths."],
    ["Exceptions", "Records and facts supporting exceptions."],
    ["Review Gates", "Records and facts supporting review gates."],
  ],
  outputs: ["Priority strategy, required actions, exception warnings, and human-review gates."],
  faqs: [
    ["Is this workflow executable now?", "No. It is scaffolded and remains non-executable until its deterministic rules, authority coverage, tests, and review UI are complete."],
    ["What happens when evidence is incomplete?", "The workflow keeps the issue unresolved rather than inventing the missing fact."],
    ["Can this workflow take a filing or mailing action automatically?", "No. Consequential actions remain disabled in scaffold status and require explicit review after the relevant implementation is complete."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
