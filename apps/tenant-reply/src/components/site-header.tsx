import { EcosystemNav } from './ecosystem-nav'

export function SiteHeader() {
  return (
    <EcosystemNav
      currentSlug="tenant-reply"
      brand="Tenant Reply"
      anchorLinks={[
        { href: '#how-it-works', label: 'How it works' },
        { href: '#notice-types', label: 'Notice types' },
        { href: '#rights', label: 'Tenant rights' },
        { href: '#faq', label: 'FAQ' },
      ]}
    />
  )
}
