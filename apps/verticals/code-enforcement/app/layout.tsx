import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import '../../../../packages/design-system/src/workspace.css'
import '../src/ui/tokens/globals.css'
import EcosystemNav from './components/EcosystemNav'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mycomind4-arch-code-enforcement.pages.dev'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Code Enforcement | MailMyPDF',
    template: '%s | Code Enforcement',
  },
  description: 'Understand a code-enforcement notice, organize the property record and evidence, prepare a response, and keep mailing proof together.',
  openGraph: {
    title: 'Code Enforcement | MailMyPDF',
    description: 'Understand code-enforcement notices and requests, organize evidence, prepare reviewable correspondence, and keep the delivery record together.',
    type: 'website',
    siteName: 'Code Enforcement',
    url: siteUrl,
    images: [{ url: '/hero.svg', width: 1200, height: 630, alt: 'Code Enforcement by MailMyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code Enforcement | MailMyPDF',
    description: 'Organize a code-enforcement matter from notice through response and proof.',
    images: ['/hero.svg'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-mmp-theme="code-enforcement" className="mmp-app">
        <EcosystemNav />
        <main>{children}</main>
      </body>
    </html>
  )
}