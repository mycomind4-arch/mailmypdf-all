import { createElement } from 'react'
import Link from 'next/link'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

export const metadata = {
  title: 'Code Enforcement Notice Response & Property Case Workflows | MailMyPDF',
  description: 'Understand a code-enforcement notice, organize property facts and evidence, prepare a reviewable response, and keep mailing and delivery proof together.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Code Enforcement | MailMyPDF',
    description: 'Notice response, inspection, evidence, records, hearing, and compliance correspondence workflows for code-enforcement matters.',
    type: 'website',
    siteName: 'Code Enforcement',
    url: '/',
    images: [{ url: '/hero.svg', width: 1200, height: 630, alt: 'Code Enforcement by MailMyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code Enforcement | MailMyPDF',
    description: 'Organize a code-enforcement matter from notice through response and proof.',
    images: ['/hero.svg'],
  },
}

const featured = [
  ['Respond to a Notice of Violation', 'Start from the actual notice, identify the cited conditions and dates, organize supporting records, and prepare a reviewable response.', '/workflows/respond-to-notice-of-violation'],
  ['Respond to an Inspection or Search Request', 'Document the request, property and recipient details, access position, correspondence history, and the response you intend to send.', '/workflows'],
  ['Challenge Inspection Findings', 'Map disputed findings to photos, permits, records, dates, and other evidence before preparing correspondence.', '/workflows/challenge-inspection-findings'],
  ['Submit Proof of Correction', 'Build a concise correction package from the cited item, completed work, photos, receipts, permits, and supporting documentation.', '/workflows/submit-proof-of-correction'],
  ['Request Inspection Records', 'Prepare a focused request for inspection notes, photographs, reports, correspondence, and other case records.', '/workflows/request-inspection-records'],
  ['Request Administrative Review', 'Organize the decision, procedural history, evidence, disputed issues, and requested review in one matter.', '/workflows/request-administrative-review'],
]

const steps = [
  ['01', 'Identify the document', 'Start with the notice, inspection request, citation, hearing notice, abatement letter, or other source document.'],
  ['02', 'Verify the case facts', 'Review property identifiers, agency, case number, cited conditions, dates, recipient information, and any stated deadline.'],
  ['03', 'Organize the evidence', 'Keep photos, permits, receipts, records requests, prior correspondence, inspection material, and other supporting documents tied to the issues they address.'],
  ['04', 'Prepare the response', 'Use the workflow for the actual situation — response, extension, correction proof, records request, hearing request, or other correspondence.'],
  ['05', 'Approve, send, and prove', 'Review the exact packet before consequential action. When mailing is appropriate, retain the tracking and proof record with the case.'],
]

export default function Home() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Code Enforcement by MailMyPDF',
    description: 'Structured document and correspondence workflows for code-enforcement matters.',
    url: 'https://mycomind4-arch-code-enforcement.pages.dev',
    publisher: { '@type': 'Organization', name: 'MailMyPDF' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />

      <VerticalHero
        theme="code-enforcement"
        tone="light"
        eyebrow="Property notices · inspections · violations · case records"
        title="Turn a code-enforcement notice into a documented case."
        description="Understand what the document says, verify the property and case facts, organize evidence, and prepare the response that fits the situation. Keep correspondence, mailing, tracking, and proof together instead of working from scattered files."
        imageSrc="/hero.svg"
        imageAlt="Residential property and code-enforcement case documents"
        actions={<><Link href="/workflows" className="mmp-button-primary">Find my workflow →</Link><Link href="/start" className="mmp-button-secondary">Upload a notice</Link></>}
        meta={<><span>Source document first</span><span>Evidence stays reviewable</span><span>Not a law firm</span></>}
      />

      <SharedTrustStrip items={[
        { title: 'Property + case context', description: 'Keep address, parcel, agency, case, and document details together' },
        { title: 'Dates for review', description: 'Surface stated dates without inventing deadlines' },
        { title: 'Human approval', description: 'Review the exact response before mailing or submission' },
        { title: 'Mailing proof available', description: 'Keep tracking and delivery evidence with the case record' },
      ]} />

      <section style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">Featured workflows</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.7rem,5vw,4.8rem)', maxWidth: 900, margin: '16px 0 0' }}>Start with the action the agency actually took.</h2>
          <p style={{ maxWidth: 760, marginTop: 20, color: 'var(--mmp-ink-muted)', lineHeight: 1.75 }}>Code-enforcement matters can involve very different documents and procedural stages. The workflow catalog separates those situations so a notice response is not treated like an inspection-records request, hearing request, correction package, or case-closure letter.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(285px,1fr))', gap: 16, marginTop: 34 }}>
            {featured.map(([title, description, href]) => <Link key={title} href={href} className="mmp-card" style={{ padding: 24, color: 'inherit', textDecoration: 'none' }}><div className="mmp-eyebrow">Code Enforcement</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 28, fontWeight: 400, margin: '12px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{description}</p><span style={{ display: 'inline-block', marginTop: 18, color: 'var(--mmp-accent)', fontWeight: 650 }}>View workflow →</span></Link>)}
          </div>
          <Link href="/workflows" className="mmp-button-secondary" style={{ marginTop: 28 }}>Browse all code-enforcement workflows →</Link>
        </div>
      </section>

      <section id="how" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">How it works</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.6rem)', maxWidth: 780, margin: '16px 0 0' }}>Notice → facts → evidence → response → proof.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: 34 }}>
            {steps.map(([n,title,text]) => <article key={n} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 24, alignItems: 'start' }}>
          <div>
            <div className="mmp-eyebrow">What the workspace organizes</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.5rem)', margin: '14px 0 0' }}>A case file, not just a letter generator.</h2>
            <p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.75, maxWidth: 650 }}>The workspace is designed to keep the source notice, property details, allegations or cited conditions, evidence, timeline, findings, correspondence, review state, and fulfillment record connected to the same matter.</p>
          </div>
          <div className="mmp-card" style={{ padding: 26 }}>
            {['Property address and identifiers','Agency, jurisdiction, and case number','Source notices and correspondence','Stated dates and procedural instructions','Allegations or cited conditions','Photos, permits, receipts, and evidence','Inspection and records-request material','Drafts, approvals, mailing, tracking, and proof'].map(item => <div key={item} style={{ padding: '11px 0', borderBottom: '1px solid var(--mmp-border)', color: 'var(--mmp-ink-muted)' }}>✓ {item}</div>)}
          </div>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)' }}>
        <div className="mmp-container mmp-reading">
          <div className="mmp-eyebrow">Safety boundary</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', margin: '14px 0 20px' }}>Local rules vary. The source record controls.</h2>
          <p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.8 }}>Code Enforcement is a document-organization, correspondence-preparation, and mailing product. It is not a law firm and does not provide legal advice. Ordinances, inspection authority, hearing rights, deadlines, and appeal procedures vary by jurisdiction. Extracted or inferred information should remain reviewable against the notice and authoritative local sources rather than being presented as a legal conclusion.</p>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}>
        <div className="mmp-container" style={{ textAlign: 'center' }}>
          <div className="mmp-eyebrow" style={{ color: '#dcc9b8' }}>Code Enforcement · MailMyPDF</div>
          <h2 className="mmp-display" style={{ color: '#fff', fontSize: 'clamp(2.9rem,6vw,5.2rem)', maxWidth: 850, margin: '16px auto 0' }}>Have the notice? Build the case around it.</h2>
          <p style={{ maxWidth: 650, margin: '20px auto 0', color: 'rgba(255,255,255,.72)', lineHeight: 1.75 }}>Choose the workflow that matches the document or action you received, then continue into the case workspace.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}><Link href="/workflows" className="mmp-button-secondary">Find my workflow →</Link><Link href="/start" className="mmp-button-secondary">Start from a notice</Link></div>
        </div>
      </section>
    </>
  )
}
