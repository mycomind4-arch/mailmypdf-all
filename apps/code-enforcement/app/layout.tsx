import '../src/ui/tokens/globals.css'
import EcosystemNav from './components/EcosystemNav'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mycomind4-arch-code-enforcement.pages.dev'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Code Enforcement | My-CoMind',
    template: '%s | Code Enforcement',
  },
  description: 'Evidence-first command center for local code-enforcement cases.',
  openGraph: {
    title: 'Code Enforcement | My-CoMind',
    description: 'Upload your code enforcement notice. We identify the property, deadlines, allegations, and next steps.',
    type: 'website',
    siteName: 'Code Enforcement',
    url: siteUrl,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Code Enforcement — My-CoMind' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code Enforcement | My-CoMind',
    description: 'Evidence-first command center for local code-enforcement cases.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EcosystemNav />
        <main>{children}</main>
      </body>
    </html>
  )
}
