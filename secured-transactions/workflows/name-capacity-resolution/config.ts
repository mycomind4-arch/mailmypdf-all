import type { WorkflowLandingConfig } from "@mailmypdf/design-system";

export const workflowConfig = {
  id: "name-capacity-resolution",
  sectionId: "secured-transactions",
  sectionName: "Secured Transactions",
  sectionPath: "/secured-transactions",
  path: "/secured-transactions/workflows/name-capacity-resolution",
  startPath: "/secured-transactions/workflows/name-capacity-resolution/start",
  title: "Name & Capacity Resolution",
  seoTitle: "Name & Capacity Resolution | Secured Transactions | MailMyPDF",
  seoDescription: "Resolve parties, authoritative names, roles, capacities, ownership relationships, and authority to act from evidence without treating formatting differences as separate legal persons.",
  eyebrow: "Secured Transactions workflow",
  heroTitle: "Name & Capacity Resolution",
  heroDescription: "Build an evidence-linked record of who the parties are, which names are supported by authoritative sources, what roles they hold, and what capacity they are acting in.",
  indexable: false,
  contentStatus: "scaffold",
  workspaceHighlights: [
    ["Normalize without overclaiming", "Comparison and search variants remain separate from legal identity conclusions."],
    ["Resolve capacity", "Track whether a person acts individually or in a representative role."],
    ["Preserve evidence", "Keep every material finding attached to its source and uncertainty state."],
  ],
  workflowSteps: [
    ["Add source records", "Collect records showing names, entities, ownership, roles, or representative authority."],
    ["Normalize names", "Create deterministic comparison keys and search variants."],
    ["Resolve identity and capacity", "Use source authority, entity classification, capacity, ownership, and role engines."],
    ["Review conflicts", "Keep unresolved contradictions visible."],
    ["Certify the result", "Produce a reviewable finding set for reuse by later workflows."],
  ],
  readyItems: [
    ["Identity records", "Records that show a person's or organization's name."],
    ["Entity records", "Formation, registration, trust, estate, or business records when relevant."],
    ["Authority records", "Documents showing representative authority when someone acts for another person or entity."],
    ["Ownership or obligation records", "Documents that help distinguish owner, debtor, obligor, secured party, guarantor, or representative roles."],
  ],
  outputs: [
    "Authoritative-name findings",
    "Entity and capacity findings",
    "Party-role and ownership relationship findings",
    "Explicit unresolved conflicts requiring review",
  ],
  faqs: [
    ["Does ALL CAPS create a different legal person?", "No. Capitalization is normalized for comparison. Identity and capacity are resolved from supported records and rules."],
    ["Are search variants valid filing names?", "Not automatically. Search variants are discovery aids and remain separate from authoritative-name findings."],
    ["What happens if the records disagree?", "The disagreement remains visible and the workflow requires review instead of silently choosing a result."],
  ],
} as const satisfies WorkflowLandingConfig;

export default workflowConfig;
