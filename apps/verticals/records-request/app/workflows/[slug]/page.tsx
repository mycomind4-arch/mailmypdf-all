import { EcosystemFooter } from '@/app/components/EcosystemFooter'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { workflows } from '../workflow-data'

export function generateStaticParams() { return workflows.map(({ slug }) => ({ slug })) }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const workflow = workflows.find(item => item.slug === slug)
  if (!workflow) return {}
  const title = workflow.seo?.title ?? `${workflow.title} | Records Requests`
  const description = workflow.seo?.description ?? workflow.description
  return {
    title,
    description,
    keywords: workflow.seo?.keywords,
    alternates: { canonical: `/workflows/${workflow.slug}` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: { title, description, type: 'website', url: `/workflows/${workflow.slug}` },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function startPath(slug: string) {
  if (slug === 'police-records' || slug === 'planning-records') return `/workflows/${slug}/builder`
  return `/workflows/${slug}/builder`
}

export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const workflow = workflows.find(item => item.slug === slug)
  if (!workflow) notFound()

  const builderPath = startPath(slug)
  const faqs = workflow.seo?.faqs ?? []
  const related = workflows.filter(item => item.slug !== slug && (item.category === workflow.category || item.bestFor.some(value => workflow.bestFor.includes(value)))).slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Records Requests', url: '/' },
      { '@type': 'WebPage', name: workflow.seo?.title ?? workflow.title, description: workflow.seo?.description ?? workflow.description, url: `/workflows/${workflow.slug}`, about: { '@type': 'Thing', name: workflow.intent } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Records Requests', item: '/' }, { '@type': 'ListItem', position: 2, name: workflow.category, item: '/#workflows' }, { '@type': 'ListItem', position: 3, name: workflow.title, item: `/workflows/${workflow.slug}` }] },
      ...(faqs.length ? [{ '@type': 'FAQPage', mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) }] : []),
    ],
  }

  const isPolice = slug === 'police-records'
  const isCode = slug === 'code-enforcement-records'
  const isCommunications = slug === 'government-communications-records'
  const isPermit = slug === 'permit-inspection-records'
  const isPlanning = slug === 'planning-records'

  return <main className="workflowPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <section className="workflowHero"><div className="eyebrow">{workflow.category} · {workflow.intent}</div><h1>{workflow.title}</h1><p className="lede">{workflow.description}</p><div className="cta"><Link className="primary" href={builderPath}>{workflow.cta} →</Link><Link className="secondary" href="/">Browse every records workflow</Link></div><div className="trust">Specific scope · Search-ready identifiers · Evidence-first tracking · Production audit ready</div></section>
    <section className="section workflowSection"><div><div className="eyebrow">SEARCH-READY SCOPE</div><h2>Build the request around the records job, not a vague request for “everything.”</h2><p className="workflowCopy">A strong records request identifies the agency, record type, time period, and identifiers or custodians that make the records searchable. Official agencies commonly ask for practical inputs such as addresses, parcel or case numbers, dates, permit numbers, custodians, and a clear description of the records sought. This workflow turns those inputs into a structured request.</p></div><div className="workflowList">{workflow.bestFor.map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section>
    {isPolice && <><section className="section workflowSection"><div><div className="eyebrow">POLICE RECORD TYPES</div><h2>Ask for the records system by system.</h2><p className="workflowCopy">Depending on the agency and applicable law, a targeted request can cover incident reports, arrest and booking records, CAD or dispatch records, body-camera and dash-camera recordings, 911 calls, photographs, witness statements, supplements, and case correspondence.</p></div><div className="workflowList">{['Incident and offense reports','CAD / dispatch records','Body- and dash-camera media','911 calls and communications','Photographs and scene media','Witness, victim and supplemental records'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section><section className="section workflowSection"><div><div className="eyebrow">MAKE THE INCIDENT SEARCHABLE</div><h2>Numbers, dates, location, people, and vehicles reduce ambiguity.</h2><p className="workflowCopy">A police-records request becomes easier to route and search when it anchors the incident to identifiers the agency already uses.</p></div><div className="workflowList">{['Incident / report number','Incident date and time window','Location','Person / vehicle identifiers'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section></>}
    {isCode && <><section className="section workflowSection"><div><div className="eyebrow">CODE ENFORCEMENT RECORD TYPES</div><h2>Target the records that explain what happened at the property.</h2><p className="workflowCopy">Depending on the agency and applicable law, a focused request can identify complaints, inspections, photographs or video, notices of violation, correction notices, citations, administrative orders, abatement records, permits, correspondence, and other identifiable enforcement records.</p></div><div className="workflowList">{['Complaints and service requests','Inspections and inspection reports','Photographs and video','Notices, citations and orders','Permits and correction records','Correspondence and enforcement communications'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section><section className="section workflowSection"><div><div className="eyebrow">PROPERTY IDENTIFIERS</div><h2>Address, parcel, case number, and dates matter.</h2><p className="workflowCopy">Code-enforcement records are often organized around property and case identifiers. Include whatever is known rather than guessing at an unknown case number.</p></div><div className="workflowList">{['Property address','Parcel / APN','Case / violation number','Date range'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section></>}
    {isPermit && <section className="section workflowSection"><div><div className="eyebrow">PROPERTY & PERMIT SEARCH</div><h2>Address, APN, permit number, project and dates create a better permit search.</h2><p className="workflowCopy">Permit research commonly uses the site address, parcel/APN, permit number, permit type, project description and date range. Historical records may live in different systems or archives, so the request should state the range and record types precisely.</p></div><div className="workflowList">{['Site address','Parcel / APN','Permit or IVR number','Permit type','Project / applicant','Date range'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section>}
    {isCommunications && <section className="section workflowSection"><div><div className="eyebrow">COMMUNICATION SEARCH</div><h2>Custodian + date range + distinctive terms beats “all emails.”</h2><p className="workflowCopy">For communications, high-value search inputs are the people or offices involved, date range, subject or project, distinctive names or phrases, known outside parties, and systems that may contain responsive messages. Attachments and related records should be identified explicitly so they can be checked separately.</p></div><div className="workflowList">{['Likely custodians','Date range','Project / subject','Distinctive keywords','Outside parties','Known systems'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section>}
    {isPlanning && <><section className="section workflowSection"><div><div className="eyebrow">PLANNING RECORD TYPES</div><h2>Build the request around the project file, not just the application.</h2><p className="workflowCopy">A strong planning request can separately identify applications, zoning materials, staff reports, project plans, public notices, hearing materials, conditions, approvals, environmental review, communications, and related permit records. Explicit categories make later production review much more reliable.</p></div><div className="workflowList">{['Planning / development applications','Zoning and land-use records','Staff reports / analyses','Site and project plans','Planning department communications','Notices and hearing materials','Approvals, conditions and resolutions','Related permits and cross-referenced records'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section><section className="section workflowSection"><div><div className="eyebrow">PROJECT IDENTIFIERS</div><h2>Property, project number, applicant and date range make the search actionable.</h2><p className="workflowCopy">Planning files can move between projects, application numbers and property records. Capturing known identifiers gives the custodian more than one path to the responsive file and gives you a stronger basis for evaluating the production.</p></div><div className="workflowList">{['Property address','Parcel / APN','Project or application number','Project / applicant name','Date range'].map((item,index)=><div className="workflowItem" key={item}><span>{String(index+1).padStart(2,'0')}</span><strong>{item}</strong></div>)}</div></section></>}
    <section className="section workflowSection"><div><div className="eyebrow">WHAT YOU ACTUALLY DO</div><h2>Turn the search into a request that an agency can act on.</h2><p className="workflowCopy">Enter what you know, identify the records, review the generated scope, and preserve the final request. The goal is a clear, searchable description of the records you want and the information that helps the custodian find them.</p></div><div className="workflowList"><div className="workflowItem"><span>01</span><strong>Describe the matter</strong></div><div className="workflowItem"><span>02</span><strong>Select records and scope</strong></div><div className="workflowItem"><span>03</span><strong>Review and validate</strong></div><div className="workflowItem"><span>04</span><strong>Approve and mail</strong></div></div></section>
    <section className="dark workflowSection"><div><div className="eyebrow">AFTER PRODUCTION</div><h2>Receiving files is not the same as verifying a complete production.</h2><p>Preserve the original request, organize the response, and review the production for missing categories, references to records that were not produced, duplicates, identifier inconsistencies, timeline gaps, and redaction or withholding language.</p></div><div className="auditGrid"><div>Request scope preserved</div><div>Agency response timeline</div><div>Production organization</div><div>Gap detection</div><div>Redaction review</div><div>Follow-up preparation</div></div></section>
    {faqs.length > 0 && <section className="section workflowSection"><div><div className="eyebrow">FREQUENTLY ASKED QUESTIONS</div><h2>{workflow.title} FAQ</h2><p className="workflowCopy">Answers focus on the practical search and request questions people ask before submitting a records request.</p></div><div className="workflowList">{faqs.map(faq => <div className="workflowItem" key={faq.question}><strong>{faq.question}</strong><p>{faq.answer}</p></div>)}</div></section>}
    {related.length > 0 && <section className="section workflowSection"><div><div className="eyebrow">RELATED RECORDS WORKFLOWS</div><h2>Explore adjacent records searches.</h2></div><div className="workflowCards">{related.map(item => <Link key={item.slug} href={`/workflows/${item.slug}`} className="workflowCard"><span className="workflowCategory">{item.category}</span><strong>{item.title}</strong><span>{item.description}</span><span className="workflowLink">Explore workflow →</span></Link>)}</div></section>}
    <section className="final"><div className="eyebrow">READY TO BUILD IT</div><h2>Turn this search into an actual request.</h2><p>Start with the objective in plain English. The workspace handles the structure.</p><Link className="primary" href={builderPath}>{workflow.cta} →</Link></section>
    <EcosystemFooter />
  </main>
}
