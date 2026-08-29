import Link from 'next/link'

export const metadata = {
  title: 'Respond to a Property Inspection Request | Code Enforcement',
  description: 'Upload the inspection request. We identify the agency, property, deadline, and what you need before responding.',
  alternates: { canonical: '/workflows/respond-to-property-inspection-request' },
  openGraph: {
    title: 'Respond to a Property Inspection Request | Code Enforcement',
    description: 'Upload the inspection request. We identify the agency, property, deadline, and what you need before responding.',
    type: 'website',
    siteName: 'Code Enforcement',
    url: '/workflows/respond-to-property-inspection-request',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Code Enforcement — My-CoMind' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Respond to a Property Inspection Request | Code Enforcement',
    description: 'Upload the inspection request. We identify the agency, property, deadline, and what you need before responding.',
    images: ['/og-image.png'],
  },
}

export default function RespondToInspectionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: "Workflows", item: "/workflows" },
          { "@type": "ListItem", position: 3, name: "Respond to a Property Inspection Request", item: "/workflows/respond-to-property-inspection-request" },
        ],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Respond to a Property Inspection Request",
        description: "Upload the inspection request. We identify the agency, property, deadline, and what you need before responding.",
        isPartOf: { "@type": "WebSite", name: "Code Enforcement" },
      }) }} />
      <main className="landing">
      <header className="landingNav">
        <strong>My-CoMind <span>/ Code Enforcement</span></strong>
        <nav>
          <Link href="/">← Back</Link>
          <Link href="/dashboard">Upload your notice →</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="eyebrow">WORKFLOW</div>
        <h1>Respond to a property inspection request.</h1>
        <p className="lede">Upload the request and we&apos;ll identify the agency, property, deadline, inspection scope, stated authority, and what you may need before responding.</p>
        <div className="cta">
          <Link className="primary" href="/dashboard">Upload the request →</Link>
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">WHAT WE LOOK FOR</div>
        <h2>The details that matter.</h2>
        <div className="steps">
          {[
            ['01', 'Agency & authority', 'Who sent the notice and what legal authority they cite for the inspection.'],
            ['02', 'Property & recipient', 'The address, parcel, and whether the recipient matches property records.'],
            ['03', 'Deadline & scope', 'When you need to respond and what the inspection covers.'],
            ['04', 'Gaps & contradictions', 'Missing information, mismatched details, or anything that needs clarification.'],
          ].map(([n, t, d]) => (
            <article key={n}>
              <b>{n}</b>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final">
        <h2>Ready to start?</h2>
        <p>Upload the inspection request and we&apos;ll take it from there.</p>
        <Link className="primary" href="/dashboard">Upload the request →</Link>
      </section>
    </main>
    </>
  )
}
