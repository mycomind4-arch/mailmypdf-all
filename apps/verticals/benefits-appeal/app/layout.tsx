import './globals.css'
import { SiteNav } from '@/app/components/SiteNav'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const SITE_URL = 'https://benefits-appeal.pages.dev'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Benefits Appeal | SSDI, SSI, Unemployment, Medicaid & VA Appeal Workflows',
  description: 'Focused workflows for appealing denied benefits — SSDI, SSI, Social Security, unemployment, EDD, Medicaid, SNAP, VA disability, workers compensation, and state disability. Upload the decision, organize evidence, draft a response, review, and mail with proof.',
  keywords: ['appeal SSDI denial','SSI denial','social security denial appeal','denied unemployment','appeal EDD denial','Medicaid denied','appeal Medicaid denial','food stamp denial','VA disability denial','workers comp denied','disability appeal','benefits reconsideration','benefits hearing','overpayment appeal'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Benefits Appeal | Government Benefits Denial & Appeal Workflows',
    description: 'Find the right workflow for appealing denied SSDI, SSI, unemployment, Medicaid, SNAP, VA, or disability benefits. Upload the decision, organize evidence, and build a supported appeal.',
    type: 'website',
    siteName: 'Benefits Appeal',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Benefits Appeal | SSDI, SSI, Unemployment, Medicaid & VA',
    description: 'Appeal denied government benefits with structured workflows, document analysis, evidence organization, and proof of delivery.',
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
