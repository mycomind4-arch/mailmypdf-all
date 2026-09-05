import { EcosystemNav } from './ecosystem-nav'

export function SiteHeader() {
  return (
    <EcosystemNav
      currentSlug="permit-reply"
      brand="Permit Reply"
      anchorLinks={[
        { href: 'https://mailmypdf.pages.dev/start', label: 'Mail a PDF' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#notice-types', label: 'Notice types' },
        { href: '#code', label: 'Code reference' },
        { href: '#faq', label: 'FAQ' },
      ]}
    />
  )
}
