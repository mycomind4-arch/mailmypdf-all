import { EcosystemFooter } from '@/app/components/EcosystemFooter'
import Link from 'next/link'

const faqs = [
  ['Can I request code enforcement records for a property?', 'Yes. A property address is a useful starting point. If known, add the parcel/APN, case number, violation or citation number, related person or entity, and date range so the agency can locate the right file.'],
  ['What code enforcement records can I request?', 'Depending on the agency and applicable law, a request can identify case files, complaints, inspections, photographs and video, notices and orders, citations, correspondence, enforcement actions, abatement and compliance records, and related permits or property records.'],
  ['Can I request code enforcement records by address?', 'Yes. The workflow is designed around property identifiers. Use the street address and add an APN, parcel number, case number, violation number, or date range when available.'],
  ['What if I do not know the code enforcement case number?', 'You can still start with the property address, parcel/APN, issue or subject matter, related person or entity, and date range. The request should not invent a case number you do not know.'],
  ['Can I request code violation history?', 'You can ask for records that show the history of complaints, violations, inspections, notices, citations, enforcement actions, abatement, compliance, and closure for the identified property or matter.'],
  ['Can I request code enforcement complaints and inspection reports?', 'Yes. Complaints, service requests, inspections, inspection reports, reinspection records, and related field records can be identified as separate categories so they are easier to search and review.'],
  ['Can I request photographs and video from a code enforcement case?', 'You can specifically identify photographs, video, field media, and associated indexing or metadata where maintained. Whether particular media is releasable depends on the custodian and applicable law.'],
  ['What if the agency produces only some of the records?', 'Keep the original request and compare the production against each requested category. Missing categories, date gaps, missing attachments, duplicate records, inconsistent identifiers, unexplained redactions, and references to unproduced records can become targeted follow-up items.'],
  ['What if records are redacted or withheld?', 'Preserve the agency response and identify the affected records and stated reason. A follow-up can then address the specific withholding or redaction rather than sending another vague request.'],
  ['Can I request records from more than one department?', 'Yes. If the matter may span code enforcement, building, planning, neighborhood services, public works, or another custodian, identify the likely departments and let the request scope explain why each is relevant.'],
]

export const metadata = {
  title: 'Code Enforcement Records Request — Property Violations, Inspections & Case Files',
  description: 'Create a focused code enforcement records request for property violations, complaints, inspections, notices, permits, citations, photos, communications, and enforcement history. Build and mail your request.',
  keywords: [
    'code enforcement records request',
    'code enforcement public records request',
    'request code enforcement records',
    'code violation records request',
    'property code enforcement records',
    'code enforcement complaint records',
    'code enforcement inspection records',
    'code violation history request',
    'property violation records',
    'building code enforcement records',
    'code enforcement case records',
    'code enforcement records by address',
    'code enforcement records by parcel number',
    'code enforcement records by case number',
    'code enforcement request template',
    'public records request for code violations',
    'request code enforcement history',
  ],
  alternates: { canonical: '/workflows/code-enforcement-records' },
  robots: { index: true, follow: true },
  openGraph: { title: 'Code Enforcement Records Request', description: 'Build a targeted request for property violations, complaints, inspections, notices, photographs, permits, communications, and enforcement history.', type: 'website' },
}

const records = [
  'Complete code-enforcement case and routing history',
  'Complaints, service requests and referrals',
  'Inspection requests, reports and reinspection records',
  'Photographs, video and field media',
  'Notices, citations, correction notices and orders',
  'Correspondence and enforcement communications',
  'Enforcement actions, hearings and documented decisions',
  'Abatement, correction, compliance and closure records',
  'Permits and related property or building records',
  'Referenced or attached records that should be produced with the file',
]

const identifiers = ['Property address', 'Parcel / APN', 'Code-enforcement case number', 'Violation / citation number', 'Related person or entity', 'Records start and end dates']

export default function CodeEnforcementRecordsLanding() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: metadata.title, description: metadata.description, url: '/workflows/code-enforcement-records' },
      { '@type': 'Service', name: 'Code Enforcement Records Request', serviceType: 'Public records request preparation and mailing', description: metadata.description, url: '/workflows/code-enforcement-records' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Records Requests', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Property & Code Enforcement', item: '/#workflows' },
        { '@type': 'ListItem', position: 3, name: 'Code Enforcement Records Request', item: '/workflows/code-enforcement-records' },
      ] },
      { '@type': 'FAQPage', mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  }

  return <main className="workflowPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className="workflowHero">
      <div className="eyebrow">PROPERTY & CODE ENFORCEMENT · PUBLIC RECORDS</div>
      <h1>Code Enforcement Records Request</h1>
      <p className="lede">Build a precise request for property violations, complaints, inspections, notices, citations, photographs, permits, communications, and enforcement history—then review and mail it from your workspace.</p>
      <div className="cta"><Link className="primary" href="/workflows/code-enforcement-records/builder">Build a Code Enforcement Records Request →</Link><Link className="secondary" href="/">Browse every records workflow</Link></div>
      <div className="trust">Search-ready identifiers · Specific record categories · Evidence-first production review · MailMyPDF fulfillment</div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">WHAT ARE CODE ENFORCEMENT RECORDS?</div><h2>Records that show how an agency handled a property or enforcement matter.</h2><p className="workflowCopy">A code-enforcement file may be spread across complaints, inspection systems, notices, correspondence, photographs, permits, citations, abatement records, and other agency systems. A useful request describes the matter and identifies the categories you want rather than simply asking for “everything.”</p><p className="workflowCopy">The goal is to give the custodian several reliable ways to locate the responsive records while preserving a clear scope you can later use to evaluate the production.</p></div>
      <div className="workflowList">{['Property and parcel identifiers','Case and violation identifiers','Complaints and inspections','Notices, orders and citations','Communications and field media','Enforcement, compliance and closure'].map((item, i) => <div className="workflowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">WHAT YOU CAN REQUEST</div><h2>Start broad enough to find the file, but specific enough to search.</h2><p className="workflowCopy">Choose the record categories that matter to the property or case. Categories remain separate so a later production review can identify exactly what was requested and what was received.</p></div>
      <div className="workflowList">{records.map((item, i) => <div className="workflowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">REQUEST BY ADDRESS, APN OR CASE NUMBER</div><h2>Give the agency the identifiers it is most likely to recognize.</h2><p className="workflowCopy">You do not need every identifier. Provide what you know. A street address may be enough to begin; a parcel/APN, case number, violation number, related party, or date range can make the search substantially more precise.</p></div>
      <div className="workflowList">{identifiers.map((item, i) => <div className="workflowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">HOW TO MAKE THE REQUEST SEARCHABLE</div><h2>Describe the issue in plain English, then anchor it to the agency's records.</h2><p className="workflowCopy">Explain what happened or what you are researching: an unpermitted construction issue, nuisance complaint, property-maintenance violation, inspection history, notice, citation, or other enforcement matter. Then add the property and time period. Do not guess at unknown case numbers.</p></div>
      <div className="workflowList">{['Name the agency and likely custodian','Describe the enforcement matter','Give the property address or case identifier','Choose the record categories','Set a sensible date range','Review the generated scope before mailing'].map((item, i) => <div className="workflowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">WHAT HAPPENS AFTER THE REQUEST?</div><h2>The response becomes evidence, not just an inbox attachment.</h2><p className="workflowCopy">MailMyPDF preserves the approved request and its scope so the production can be evaluated against what was actually requested. The workflow is designed to identify missing categories, partial productions, date gaps, missing attachments, duplicate records, identifier inconsistencies, and unexplained withholding or redaction language.</p></div>
      <div className="workflowList">{['Original request scope preserved','Agency response and production tracked','Records organized by requested category','Missing or partial production identified','Referenced-but-unproduced records surfaced','Follow-up questions prepared from the evidence'].map((item, i) => <div className="workflowItem" key={item}><span>{String(i + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
    </section>

    <section className="dark workflowSection">
      <div><div className="eyebrow">WHEN THE PRODUCTION IS INCOMPLETE</div><h2>A missing record should become a specific follow-up, not another vague request.</h2><p>Keep the original request, the agency response, and the production together. If an inspection report references photographs that were not produced, or a notice references a case number that is missing, those facts can support a focused follow-up.</p></div>
      <div className="auditGrid"><div>Category gaps</div><div>Date-range gaps</div><div>Missing attachments</div><div>Identifier mismatches</div><div>Redactions / withholding</div><div>Referenced records</div></div>
    </section>

    <section className="section workflowSection">
      <div><div className="eyebrow">FREQUENTLY ASKED QUESTIONS</div><h2>Code enforcement records request FAQ</h2><p className="workflowCopy">Practical answers to the questions that usually determine whether a property-records search is precise enough to be useful.</p></div>
      <div className="workflowList">{faqs.map(([question, answer]) => <div className="workflowItem" key={question}><strong>{question}</strong><p>{answer}</p></div>)}</div>
    </section>

    <section className="final"><div className="eyebrow">READY TO SEARCH THE FILE</div><h2>Build the request around the property or enforcement matter.</h2><p>Start with the agency, address, case information, date range, and the records you want. The builder turns that information into a structured request ready for review.</p><Link className="primary" href="/workflows/code-enforcement-records/builder">Build a Code Enforcement Records Request →</Link></section>
    <EcosystemFooter />
  </main>
}
