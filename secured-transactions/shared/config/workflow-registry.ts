export const securedTransactionWorkflowCatalog = [
  {
    "slug": "name-capacity-resolution",
    "title": "Name & Capacity Resolution"
  },
  {
    "slug": "secured-transaction-eligibility",
    "title": "Secured-Transaction Eligibility"
  },
  {
    "slug": "obligation-value",
    "title": "Obligation & Value"
  },
  {
    "slug": "collateral-ownership-classification",
    "title": "Collateral Ownership & Classification"
  },
  {
    "slug": "governing-law-filing-jurisdiction",
    "title": "Governing Law & Filing Jurisdiction"
  },
  {
    "slug": "pre-filing-lien-priority-search",
    "title": "Pre-Filing Lien & Priority Search"
  },
  {
    "slug": "priority-strategy",
    "title": "Priority Strategy"
  },
  {
    "slug": "security-agreement-generation",
    "title": "Security Agreement Generation"
  },
  {
    "slug": "attachment-certification",
    "title": "Attachment Certification"
  },
  {
    "slug": "perfection-method-selection",
    "title": "Perfection Method Selection"
  },
  {
    "slug": "ucc1-preparation-authorization",
    "title": "UCC-1 Preparation & Authorization"
  },
  {
    "slug": "perfection-execution",
    "title": "Perfection Execution"
  },
  {
    "slug": "post-perfection-verification",
    "title": "Post-Perfection Verification"
  },
  {
    "slug": "first-priority-determination",
    "title": "First-Priority Determination"
  },
  {
    "slug": "priority-remediation",
    "title": "Priority Remediation"
  },
  {
    "slug": "priority-preservation-monitoring",
    "title": "Priority Preservation & Monitoring"
  },
  {
    "slug": "amendment-continuation-assignment-termination",
    "title": "Amendment / Continuation / Assignment / Termination"
  }
] as const;

export type SecuredTransactionWorkflowId = typeof securedTransactionWorkflowCatalog[number]["slug"];

export function isSecuredTransactionWorkflowId(value: string): value is SecuredTransactionWorkflowId {
  return securedTransactionWorkflowCatalog.some((item) => item.slug === value);
}
