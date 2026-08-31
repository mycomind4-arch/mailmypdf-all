import Link from 'next/link'

export const metadata = {
  title: 'Code Enforcement | My-CoMind',
  description: 'Upload your code enforcement notice. We identify the property, deadlines, allegations, and next steps.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Code Enforcement | My-CoMind',
    description: 'Upload your code enforcement notice. We identify the property, deadlines, allegations, and next steps.',
    type: 'website',
    siteName: 'Code Enforcement',
    url: '/',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Code Enforcement — My-CoMind' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code Enforcement | My-CoMind',
    description: 'Upload your code enforcement notice. We identify the property, deadlines, allegations, and next steps.',
    images: ['/og-image.png'],
  },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Code Enforcement",
        description: "Evidence-first command center for local code-enforcement cases.",
        url: "https://mycomind4-arch-code-enforcement.pages.dev",
        publisher: { "@type": "Organization", name: "My-CoMind" },
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Code Enforcement",
        serviceType: "Code enforcement notice analysis and response preparation",
        provider: { "@type": "Organization", name: "My-CoMind" },
        description: "Upload your code enforcement notice. We identify the property, deadlines, allegations, and next steps.",
        areaServed: { "@type": "Country", name: "United States" },
      }) }} />
      <main className="landing">
      <header className="landingNav">
        <strong>My-CoMind <span>/ Code Enforcement</span></strong>
        <nav>
          <a href="#how">How it works</a>
          <Link href="/dashboard">Upload your notice →</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">CODE ENFORCEMENT NOTICE RESPONSE</div>
        <h1>Upload your notice. <em>We&apos;ll handle the rest.</em></h1>
        <p className="lede">We&apos;ll identify the property, deadlines, allegations, evidence gaps, and next steps — then help you respond with confidence.</p>
        <div className="cta">
          <Link className="primary" href="/dashboard">Upload your notice →</Link>
          <a className="secondary" href="#how">How it works</a>
        </div>
        <div className="trust">No account needed to start · Your documents stay yours</div>
      </section>

      <section id="how" className="section">
        <div className="eyebrow">HOW IT WORKS</div>
        <h2>Three steps from notice to response.</h2>
        <div className="steps">
          {[
            ['01', 'Upload', 'Drop in your notice, photos, permits, or any documents related to the case.'],
            ['02', 'Review', 'We extract the key facts — address, deadline, violations, agency — and you confirm them.'],
            ['03', 'Respond', 'With the facts organized, prepare your response, records request, or next action.'],
          ].map(([n, t, d]) => (
            <article key={n}>
              <b>{n}</b>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">WHAT WE ORGANIZE</div>
        <h2>Everything in one place.</h2>
        <div className="chips">
          {[
            'Property address and parcel',
            'Response deadline',
            'Alleged violations',
            'Agency and jurisdiction',
            'Evidence files',
            'Case timeline',
            'Completeness checks',
          ].map(x => <span key={x}>{x}</span>)}
        </div>
        <p className="fine">Local ordinances, deadlines, hearing rights, and appeal procedures vary. The system identifies what it can from your documents and labels uncertainty rather than presenting assumptions as legal conclusions.</p>
      </section>

      <section className="final">
        <h2>Have the notice already?</h2>
        <p>Upload it and we&apos;ll get started.</p>
        <Link className="primary" href="/dashboard">Upload your notice →</Link>
      </section>
    </main>
    </>
  )
}
