import './globals.css'
import { SiteNav } from '@/app/components/SiteNav'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const SITE_URL = 'https://insurance-claims.pages.dev'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Insurance Claims | Denied Claim, Coverage Dispute & Appeal Workflows',
  description: 'Focused workflows for denied insurance claims, coverage denials, health and medical denials, disability, workers compensation, life insurance, auto, home, roof, water, fire, and commercial property claims. Upload the denial, organize evidence, draft a response, review, and mail with proof.',
  keywords: ['insurance claim denied','appeal insurance denial','coverage denial','dispute insurance claim','health insurance denial','disability insurance denied','workers comp denied','life insurance claim denied','car insurance claim denied','home insurance claim denied','roof insurance claim','water damage insurance claim','fire damage insurance claim','hail damage claim','flood damage claim','underpaid insurance claim','business interruption insurance','total loss insurance claim'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Insurance Claims | Denied Claim & Insurance Appeal Workflows',
    description: 'Find the right workflow for a denied insurance claim, coverage denial, roof claim, health claim, disability claim, workers compensation, auto, life, or commercial property dispute.',
    type: 'website',
    siteName: 'Insurance Claims',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insurance Claims | Denied Claim & Appeal Workflows',
    description: 'Problem-specific insurance claim workflows with document upload, analysis, response drafting, review, and mailing proof.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SiteNav />
        <main>{children}</main>
        <EcosystemFooter />
      </body>
    </html>
  )
}
