import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import './globals.css'
import { SiteNav } from '@/app/components/SiteNav'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const SITE_URL = 'https://insurance-claims.pages.dev'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Insurance Claims | Denied Claim, Coverage Dispute & Appeal Workflows | MailMyPDF',
  description: 'Focused workflows for denied and underpaid insurance claims, coverage disputes, evidence packages, reviewable correspondence, and mailing with proof.',
  keywords: ['insurance claim denied','appeal insurance denial','coverage denial','dispute insurance claim','health insurance denial','disability insurance denied','workers comp denied','life insurance claim denied','car insurance claim denied','home insurance claim denied','roof insurance claim','water damage insurance claim','fire damage insurance claim','underpaid insurance claim'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Insurance Claims | MailMyPDF',
    description: 'Organize the claim record, evidence, insurer correspondence, response, and delivery proof in one workflow.',
    type: 'website',
    siteName: 'Insurance Claims',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insurance Claims | MailMyPDF',
    description: 'Evidence-first insurance claim and denial-response workflows with review and mailing proof.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body data-mmp-theme="insurance-claims" className="mmp-app">
        <SiteNav />
        <main>{children}</main>
        <EcosystemFooter />
      </body>
    </html>
  )
}
