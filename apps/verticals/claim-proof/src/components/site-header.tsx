import { EcosystemNav } from './ecosystem-nav'

export function SiteHeader() {
  return (
    <EcosystemNav
      currentSlug="claim-proof"
      brand="Claim Proof"
      anchorLinks={[
        { href: 'https://mailmypdf.pages.dev/start', label: 'Mail a PDF' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#claim-types', label: 'Claim types' },
        { href: '#trust', label: 'Trust' },
        { href: '#faq', label: 'FAQ' },
      ]}
    />
  )
}
