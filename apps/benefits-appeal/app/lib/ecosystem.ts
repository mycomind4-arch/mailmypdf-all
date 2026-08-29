// Canonical ecosystem navigation — shared across all MailMyPDF product sites
export interface EcosystemProduct {
  product: string
  href: string
  description: string
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  { product: "MailMyPDF", href: "https://mailmypdf-etc.pages.dev", description: "Core document and letter mailing workflows" },
  { product: "Appeal Mail", href: "https://appeal-mail.pages.dev", description: "Appeals, reconsiderations, denials, and adverse decisions" },
  { product: "Insurance Claims", href: "https://insurance-claims.pages.dev", description: "Denied insurance claims, coverage disputes, and property damage" },
  { product: "Benefits Appeal", href: "https://benefits-appeal.pages.dev", description: "SSDI, SSI, unemployment, Medicaid, SNAP, VA, and disability appeals" },
  { product: "Debt Defense", href: "https://debt-defense.pages.dev", description: "Debt validation, collection disputes, and credit report corrections" },
  { product: "Notice Respond", href: "https://notice-respond.pages.dev", description: "Official notices, agency actions, and formal responses" },
  { product: "Immigration Mail", href: "https://immigration-mail.pages.dev", description: "Immigration notices, evidence packages, and explanation letters" },
  { product: "Dispute Mail", href: "https://dispute-mail.pages.dev", description: "Debt, credit, billing, collections, and consumer disputes" },
  { product: "Code Enforcement", href: "https://mycomind4-arch-code-enforcement.pages.dev", description: "Code enforcement notices, violations, and compliance" },
  { product: "Records Requests", href: "https://mycomind4-arch-records-requests.pages.dev", description: "FOIA, public records, and agency document requests" },
  { product: "Small Business Mail", href: "https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev", description: "Business correspondence, reminders, demands, and compliance" },
  { product: "Private Office", href: "https://mycomind4-arch-mailmypdf-private-office.pages.dev", description: "Professional correspondence, provably delivered" },
  { product: "GovReply", href: "https://govreply.pages.dev", description: "Government correspondence, handled" },
]

export const ECOSYSTEM_PAGE_URL = "https://mailmypdf-etc.pages.dev/products"
