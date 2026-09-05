import './globals.css'
import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import '../../../../packages/design-system/src/workspace.css'
import EcosystemNav from './components/EcosystemNav'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://records.mailmypdf.ai'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Public Records Requests | Request, Track & Audit Government Records',
    template: '%s | Records Requests',
  },
  description: 'Build precise public-records and government-records requests, track agency responses, organize productions, and audit what you actually received.',
  openGraph: {
    title: 'Public Records Requests',
    description: 'Request, track, receive, and audit government records in one evidence-first workspace.',
    type: 'website',
    siteName: 'Records Requests',
    url: siteUrl,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Records Requests — MailMyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Public Records Requests | MailMyPDF',
    description: 'Request, track, receive, and audit government records in one evidence-first workspace.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-mmp-theme="records-request">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <EcosystemNav />
        <div id="main-content">{children}</div>
      </body>
    </html>
  )
}