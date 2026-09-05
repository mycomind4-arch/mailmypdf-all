import { EcosystemNav } from './ecosystem-nav'

export function SiteHeader() {
  return (
    <EcosystemNav
      currentSlug="tenant-reply"
      brand="Tenant Reply"
      anchorLinks={[
        { href: 'https://mailmypdf.pages.dev/start', label: 'Mail a PDF' },
        { href: '/workflows', label: 'Workflows' },
        { href: '/#how-it-works', label: 'How it works' },
        { href: '/#notice-types', label: 'Notice types' },
        { href: '/#trust', label: 'Trust' },
        { href: '/#faq', label: 'FAQ' },
      ]}
    />
  )
}
