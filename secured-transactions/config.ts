import type { SectionLandingConfig } from "@mailmypdf/design-system";

export const securedTransactionsConfig = {
  id: "secured-transactions",
  name: "Secured Transactions",
  path: "/secured-transactions",
  tone: "dark",
  seoTitle: "Secured Transactions | MailMyPDF",
  seoDescription: "Organize identity, capacity, obligation, collateral, evidence, authority, and transaction records in a reviewable workflow.",
  eyebrow: "Identity · capacity · evidence · transaction record",
  heroTitle: "Build the transaction record before taking the next step.",
  heroDescription: "Resolve who the parties are, what capacity they are acting in, what the records actually show, and which questions remain unresolved before any consequential action is considered.",
  heroImage: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221600%22%20height%3D%22900%22%20viewBox%3D%220%200%201600%20900%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23182837%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%235b7082%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Crect%20width%3D%221600%22%20height%3D%22900%22%20fill%3D%22url(%23g)%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23dfe8ee%22%20stroke-width%3D%225%22%20opacity%3D%22.8%22%3E%3Crect%20x%3D%22470%22%20y%3D%22190%22%20width%3D%22660%22%20height%3D%22520%22%20rx%3D%2222%22%2F%3E%3Cpath%20d%3D%22M570%20325h460M570%20410h310M570%20495h380M570%20580h250%22%2F%3E%3Ccircle%20cx%3D%221060%22%20cy%3D%22600%22%20r%3D%2288%22%2F%3E%3Cpath%20d%3D%22M1015%20600l30%2030%2058-68%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E",
  introTitle: "Start with the facts that later workflows depend on.",
  introText: "The section is organized as a connected workflow family. Early identity, capacity, ownership, obligation, and evidence findings can be reused by later workflows without hiding uncertainty.",
  trustLead: "Evidence-linked findings",
  topics: [
    { title: "Names & entities", text: "Normalize names for comparison while keeping legal identity and authoritative-name findings separate." },
    { title: "Capacity & authority", text: "Track whether a person is acting individually, as a representative, or for an organization, trust, or estate." },
    { title: "Ownership & obligations", text: "Keep claims about ownership, obligations, and party roles attached to supporting records." },
    { title: "Review before action", text: "Unresolved or contradictory material facts remain visible and require review." },
  ],
  featured: [
    { slug: "name-capacity-resolution", title: "Name & Capacity Resolution", description: "Resolve parties, authoritative names, roles, capacities, ownership relationships, and authority to act." },
    { slug: "secured-transaction-eligibility", title: "Secured-Transaction Eligibility", description: "Assess whether the available facts support moving into a secured-transaction workflow family." },
    { slug: "obligation-value", title: "Obligation & Value", description: "Organize the obligation, value, parties, and supporting records." },
    { slug: "collateral-ownership-classification", title: "Collateral Ownership & Classification", description: "Organize proposed collateral, ownership evidence, and classification questions." },
  ],
  outcomes: [
    "Evidence-linked findings",
    "Explicit unresolved issues and contradictions",
    "A reviewable matter record that later workflows can reuse",
  ],
  safetyTitle: "The system should not invent a transaction basis.",
  safetyBody: "If a material fact, ownership claim, authority, obligation, or jurisdictional conclusion is unsupported, the workflow should keep it unresolved rather than filling the gap.",
  faqs: [
    ["Does capitalization create a separate legal person?", "No. Name normalization is used for comparison and search; identity and capacity are resolved from evidence and applicable rules."],
    ["Will the workflow guess when records conflict?", "No. Material conflicts should remain visible until they are resolved or explicitly reviewed."],
    ["Can this scaffold take consequential actions?", "No. The current section shell and initial workflow are deliberately non-executable while rule and authority coverage are still being built."],
  ],
  related: [
    { name: "Records Requests", path: "/records-request", description: "Obtain source records that may support a matter." },
    { name: "Dispute Mail", path: "/dispute-mail", description: "Organize evidence-heavy disputes and correspondence." },
    { name: "Private Office", path: "/private-office", description: "Private matter workflows and advanced case-building tools." },
  ],
} as const satisfies SectionLandingConfig;

export default securedTransactionsConfig;
