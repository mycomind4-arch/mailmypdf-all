/**
 * MailMyPDF Ecosystem — shared navigation data for Records Requests.
 * Keeps all vertical links in one place so headers and footers stay in sync.
 */

export interface EcosystemProduct {
  name: string
  href: string
  description: string
}

export const ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  { name: 'MailMyPDF', href: 'https://mailmypdf-etc.pages.dev', description: 'Core document and letter mailing workflows' },
  { name: 'Appeal Mail', href: 'https://appeal-mail.pages.dev', description: 'Appeals, reconsiderations, denials, and adverse decisions' },
  { name: 'Insurance Claims', href: 'https://insurance-claims.pages.dev', description: 'Denied insurance claims, coverage disputes, and property damage' },
  { name: 'Benefits Appeal', href: 'https://benefits-appeal.pages.dev', description: 'SSDI, SSI, unemployment, Medicaid, SNAP, VA, and disability appeals' },
  { name: 'Debt Defense', href: 'https://debt-defense.pages.dev', description: 'Debt validation, collection disputes, and credit report corrections' },
  { name: 'Notice Respond', href: 'https://notice-respond.pages.dev', description: 'Official notices, agency actions, and formal responses' },
  { name: 'Immigration Mail', href: 'https://immigration-mail.pages.dev', description: 'Immigration notices, evidence packages, and explanation letters' },
  { name: 'Dispute Mail', href: 'https://dispute-mail.pages.dev', description: 'Debt, credit, billing, collections, and consumer disputes' },
  { name: 'Code Enforcement', href: 'https://mycomind4-arch-code-enforcement.pages.dev', description: 'Code enforcement notices, violations, and compliance' },
  { name: 'Private Office', href: 'https://mycomind4-arch-mailmypdf-private-office.pages.dev', description: 'Professional correspondence, provably delivered' },
  { name: 'Small Business Mail', href: 'https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev', description: 'Business correspondence, reminders, demands, and compliance' },
]

export const ECOSYSTEM_PAGE_URL = 'https://mailmypdf-etc.pages.dev/products'
export const MAILMYPDF_HOME = 'https://mailmypdf-etc.pages.dev'
