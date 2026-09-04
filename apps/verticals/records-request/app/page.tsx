import Link from 'next/link'
import { workflows } from './workflows/workflow-data'
import { EcosystemFooter } from './components/EcosystemFooter'
import WorkflowDirectory from './components/WorkflowDirectory'

export const metadata = {
  title: 'Public Records Requests | Request, Track & Audit Government Records',
  description: 'Build precise public-records requests in plain English, track agency responses, organize productions, and audit what you actually received.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Public Records Requests | Request, Track & Audit Government Records',
    description: 'Request, track, receive, and audit government records in one evidence-first workspace.',
    type: 'website',
    siteName: 'MailMyPDF Records Requests',
    url: '/',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Records Requests — MailMyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Public Records Requests | MailMyPDF',
    description: 'Request, track, receive, and audit government records in one evidence-first workspace.',
    images: ['/og-image.png'],
  },
}

const groups = [
  { title: 'Start here', items: ['public-records-request', 'foia-request', 'public-information-request', 'open-records-request', 'agency-records-request', 'government-documents-request'], description: 'General public records, open records, FOIA, public information, agency, and government documents workflows.' },
  { title: 'Law enforcement & courts', items: ['police-records', 'police-report', 'police-report-copy', 'court-records', 'criminal-records', 'criminal-history', 'arrest-records', 'background-check-records'], description: 'Get the reports, filings, case materials, and history tied to an incident, case, or person.' },
  { title: 'Property & development', items: ['property-records', 'permit-inspection-records', 'code-enforcement-records', 'planning-records'], description: 'Request property, parcel, code, permit, inspection, zoning, and development records.' },
  { title: 'Vital records', items: ['birth-records', 'marriage-records', 'divorce-records', 'death-records'], description: 'Request birth, marriage, divorce, and death records from the appropriate vital records office.' },
  { title: 'Personal records', items: ['military-records', 'medical-records', 'employment-records', 'education-records'], description: 'Request military, medical, employment, and education records held by government agencies or institutions.' },
  { title: 'Communications & cases', items: ['government-communications-records', 'case-records'], description: 'Target agency communications or build a records request around a specific case.' },
  { title: 'Follow up & appeal', items: ['records-follow-up', 'records-denial-appeal'], description: 'Follow up on unanswered requests or appeal a records denial.' },
]

const audiences = [
  ['Property owners', 'Research permits, code enforcement, inspections, planning files, and property records tied to an address or parcel.'],
  ['Journalists & researchers', 'Build precise requests, preserve agency responses, and audit productions for unanswered categories and gaps.'],
  ['Attorneys & investigators', 'Keep requests, communications, records, identifiers, timelines, and production analysis together.'],
  ['Residents & advocates', 'Start in plain English without needing to know the exact records workflow or agency terminology.'],
]

const faqs = [
  ['What is a public records request?', 'A public records request asks a government agency for identifiable records it maintains. A strong request clearly describes the records, relevant time period, and useful identifiers or custodians.'],
  ['What should I include in a public records request?', 'Include the agency, subject or matter, specific record categories, date range, known names or identifiers, preferred format when appropriate, and useful narrowing information.'],
  ['Can I request records by address or case number?', 'Yes. Addresses, parcel numbers, permit numbers, incident numbers, case numbers, project names, people, and other agency identifiers can make a request substantially more precise.'],
  ['What happens if the agency produces only part of the request?', 'The request and production stay together so you can compare the original scope against what was produced and identify missing categories, references to unproduced records, redaction questions, and follow-up needs.'],
]

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Records Requests",
        description: "Build precise public-records and government-records requests, track agency responses, organize productions, and audit what you actually received.",
        url: "https://records.mailmypdf.ai",
        publisher: { "@type": "Organization", name: "MailMyPDF" },
        hasPart: workflows.map((w) => ({ "@type": "WebPage", name: w.title, url: '/workflows/' + w.slug })),
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Records Requests",
        serviceType: "Public records request preparation and tracking",
        provider: { "@type": "Organization", name: "MailMyPDF" },
        description: "Build precise public-records requests in plain English, track agency responses, organize productions, and audit what you actually received.",
        areaServed: { "@type": "Country", name: "United States" },
      }) }} />
      <main className="recordsHome">
      <section className="recordsHero">
        <div className="recordsHero__copy">
          <div className="eyebrow">PUBLIC RECORDS · FOIA · OPEN RECORDS</div>
          <h1>Request, track &amp; audit government records.</h1>
          <p className="lede">Describe what you are trying to find in plain English. We help turn that into a precise request, track the agency response, organize the production, and identify what still needs attention.</p>
          <div className="cta">
            <Link className="primary" href="/dashboard">Start a Records Request →</Link>
            <Link className="secondary" href="/workflows">Explore Workflows</Link>
          </div>
          <div className="trust">Evidence-first · Deadline-aware · Source-linked · Production audit ready</div>
        </div>
        <div className="recordsHero__visual" aria-hidden="true">
          <div className="paperStack paperStack--back"><div /><div /><div /></div>
          <div className="paperStack paperStack--front">
            <span className="paperStamp">PUBLIC RECORDS</span>
            <div className="paperLine paperLine--wide" /><div className="paperLine" /><div className="paperLine" /><div className="paperLine paperLine--short" />
            <div className="paperMeta"><span>REQUEST</span><span>TRACK</span><span>AUDIT</span></div>
          </div>
        </div>
      </section>

      <section className="section introSection">
        <div className="eyebrow">ONE WORKSPACE</div>
        <h2>From a vague objective to a complete records matter.</h2>
        <p className="directoryIntro">Every workflow follows the same simple lifecycle so first-time requesters get guidance while experienced users can inspect every important detail.</p>
        <div className="lifecycleGrid" id="how">
          <article><b>01</b><h3>Define</h3><p>Turn the objective into precise record categories, dates, custodians, identifiers, formats, and exclusions.</p></article>
          <article><b>02</b><h3>Validate</h3><p>Check the agency, jurisdiction, scope, and likely searchability before a request is sent.</p></article>
          <article><b>03</b><h3>Track</h3><p>Preserve acknowledgements, deadlines, extensions, fees, productions, denials, and communications.</p></article>
          <article><b>04</b><h3>Audit</h3><p>Compare what you requested with what the agency actually produced and surface evidence-backed gaps.</p></article>
        </div>
      </section>

      <section className="section featuredSection">
        <div className="eyebrow">FEATURED WORKFLOWS</div>
        <WorkflowDirectory workflows={workflows.map(({ slug, title, description, category }) => ({ slug, title, description, category }))} groups={groups} />
      </section>

      <section className="recordsAudit">
        <div className="recordsAudit__copy">
          <div className="eyebrow">THE DIFFERENCE</div>
          <h2>Getting files is not the same as getting a complete production.</h2>
          <p>We keep the original request, agency response, produced records, references, redactions, and unresolved categories together so you can see what still needs attention.</p>
        </div>
        <div className="auditGrid">
          <div>Unanswered categories</div><div>Referenced records not produced</div><div>Missing or duplicate pages</div><div>Redaction questions</div><div>Search or custodian gaps</div><div>Timeline anomalies</div>
        </div>
      </section>

      <section className="section audienceSection">
        <div className="eyebrow">BUILT FOR REAL RECORDS WORK</div>
        <h2>Useful whether you need one document or a complete production.</h2>
        <div className="audienceGrid">{audiences.map(([title, description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="section faqSection">
        <div className="eyebrow">PUBLIC RECORDS BASICS</div>
        <h2>Common questions before you start.</h2>
        <div className="faqGrid">{faqs.map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div>
      </section>

      <section className="final recordsFinal">
        <div className="eyebrow">START WITH WHAT YOU NEED</div>
        <h2>Tell us what records you need.</h2>
        <p>You do not need to know the exact workflow name. Start with the objective in plain English and move into the right records workflow.</p>
        <Link className="primary" href="/dashboard">Start a Records Request →</Link>
      </section>

      <EcosystemFooter />
    </main>
    </>
  )
}
