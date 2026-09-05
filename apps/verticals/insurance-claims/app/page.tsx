import { createElement } from 'react'
import Link from 'next/link'
import { INSURANCE_WORKFLOWS, type InsuranceWorkflowFamily } from '@/domain/insurance-workflows'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

const families: InsuranceWorkflowFamily[] = ['New Claims','Denied Claims','Property Damage','Disputes & Appeals','Health & Disability','Specialized Claims']

const familyDescriptions: Record<InsuranceWorkflowFamily, string> = {
  'New Claims': 'Organize the loss, policy information, damage documentation, estimates, correspondence, and source-linked timeline before submission.',
  'Denied Claims': 'Start from the denial reason and cited policy language, identify evidence gaps, and build a reviewable response or appeal.',
  'Property Damage': 'Document water, fire, hail, theft, mold, flood, roof, and other property losses with photos, estimates, inventories, and reports.',
  'Disputes & Appeals': 'Prepare a fact-based dispute, supplemental claim, reconsideration request, or appeal from the reviewed claim record.',
  'Health & Disability': 'Organize medical, disability, authorization, provider, and coverage evidence around the stated denial or limitation.',
  'Specialized Claims': 'Structure complex business interruption, total-loss, commercial property, valuation, and related evidence-heavy matters.',
}

export const metadata = {
  title: 'Insurance Claims | Denied Claim, Coverage Dispute & Appeal Workflows',
  description: 'Organize an insurance claim or denial, connect evidence to the disputed issues, prepare reviewable correspondence, and keep mailing and proof together.',
}

export default function Home() {
  const totalWorkflows = INSURANCE_WORKFLOWS.length
  const featured = INSURANCE_WORKFLOWS.slice().sort((a,b) => b.monthlySearches - a.monthlySearches).slice(0, 8)

  return (
    <>
      <VerticalHero
        theme="insurance-claims"
        tone="light"
        eyebrow={`Insurance claims · ${totalWorkflows} focused workflows`}
        title="Build the claim record before you challenge the decision."
        description="Whether the issue is a denial, underpayment, coverage dispute, property loss, health claim, disability claim, auto claim, or specialized loss, start with the actual policy and correspondence. Organize evidence, prepare a reviewable response, and preserve the mailing and delivery record."
        imageSrc="/hero-bg.png"
        imageAlt="Insurance policy, claim correspondence, photographs, estimates, and supporting records"
        actions={<><Link href="/workflows" className="mmp-button-primary">Find my claim workflow →</Link><Link href="/start" className="mmp-button-secondary">Start from my documents</Link></>}
        meta={<><span>Policy + correspondence first</span><span>Evidence stays source-linked</span><span>No outcome guarantees</span></>}
      />

      <SharedTrustStrip items={[
        { title: 'Claim-specific workflows', description: 'Use the workflow built for the loss or denial you actually have' },
        { title: 'Evidence organized by issue', description: 'Connect photos, estimates, reports, and records to the points they support' },
        { title: 'Review before submission', description: 'Verify the exact response and attachments before consequential action' },
        { title: 'Mailing proof available', description: 'Keep tracking and delivery records with the claim matter' },
      ]}/>

      <section style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">Browse by claim situation</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.7rem,5vw,4.8rem)', maxWidth: 900, margin: '16px 0 0' }}>One product system. Different claim problems.</h2>
          <p style={{ maxWidth: 760, color: 'var(--mmp-ink-muted)', lineHeight: 1.75, marginTop: 20 }}>The shared workspace handles documents, facts, evidence, drafting, review, approval, fulfillment, tracking, and proof. Each insurance workflow supplies the claim-specific questions, evidence requirements, terminology, safety rules, and response structure.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginTop: 34 }}>
            {families.map(family => {
              const workflows = INSURANCE_WORKFLOWS.filter(w => w.family === family)
              return <Link key={family} href={`/workflows?family=${encodeURIComponent(family)}`} className="mmp-card" style={{ padding: 24, color: 'inherit', textDecoration: 'none' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div className="mmp-eyebrow">{family}</div><span style={{ fontSize: 12, color: 'var(--mmp-ink-muted)' }}>{workflows.length} workflows</span></div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 29, fontWeight: 400, margin: '12px 0 8px' }}>{family}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{familyDescriptions[family]}</p><span style={{ display: 'inline-block', marginTop: 18, color: 'var(--mmp-accent)', fontWeight: 650 }}>Explore this category →</span></Link>
            })}
          </div>
        </div>
      </section>

      <section id="how" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">The claim workflow</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.6rem)', maxWidth: 820, margin: '16px 0 0' }}>From source documents to an approved claim packet.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: 34 }}>
            {[
              ['01','Claim context','Identify the policy, claim, insurer, loss, parties, and source correspondence.'],
              ['02','Coverage record','Keep declarations, policy sections, endorsements, explanations, and insurer positions available for review.'],
              ['03','Evidence','Organize photos, estimates, invoices, reports, medical records, inventories, provider letters, and other supporting material.'],
              ['04','Timeline + gaps','Build the chronology and surface missing information, contradictions, or unsupported assumptions.'],
              ['05','Response','Prepare the appropriate claim letter, supplement, dispute, appeal, reconsideration request, or evidence package.'],
              ['06','Review + proof','Approve the exact packet before submission, then retain the available mailing, tracking, and delivery record.'],
            ].map(([n,title,text]) => <article key={n} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">Popular insurance workflows</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.5rem)', margin: '16px 0 0' }}>Start with the exact claim issue.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 34 }}>
            {featured.map(w => <Link key={w.id} href={`/workflows/${w.id}`} className="mmp-card" style={{ padding: 24, color: 'inherit', textDecoration: 'none' }}><div className="mmp-eyebrow">{w.family}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 27, fontWeight: 400, margin: '12px 0 8px' }}>{w.name}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{w.description}</p><span style={{ display: 'inline-block', marginTop: 18, color: 'var(--mmp-accent)', fontWeight: 650 }}>View workflow →</span></Link>)}
          </div>
          <Link href="/workflows" className="mmp-button-secondary" style={{ marginTop: 28 }}>Browse all {totalWorkflows} workflows →</Link>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)' }}>
        <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
          <div><div className="mmp-eyebrow">Safety boundary</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.3rem)', margin: '14px 0 0' }}>Documents and evidence, not promises.</h2></div>
          <div className="mmp-card" style={{ padding: 26 }}><strong>No invented coverage conclusions.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Policy language, denial reasons, dates, claim values, medical facts, damage facts, and insurer positions should remain tied to the source record and user review.</p></div>
          <div className="mmp-card" style={{ padding: 26 }}><strong>No guaranteed claim result.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Insurance Claims helps organize and prepare claim correspondence. It does not guarantee coverage, payment, reversal, settlement, or any other insurer decision.</p></div>
        </div>
      </section>

      <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}>
        <div className="mmp-container" style={{ textAlign: 'center' }}>
          <div className="mmp-eyebrow" style={{ color: '#c9dce6' }}>Insurance Claims · MailMyPDF</div>
          <h2 className="mmp-display" style={{ color: '#fff', fontSize: 'clamp(2.9rem,6vw,5.2rem)', maxWidth: 850, margin: '16px auto 0' }}>Build a claim packet you can actually review and prove you sent.</h2>
          <p style={{ maxWidth: 650, margin: '20px auto 0', color: 'rgba(255,255,255,.72)', lineHeight: 1.75 }}>Choose the workflow that matches the loss, denial, dispute, or appeal and continue into the claim workspace.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 28 }}><Link href="/workflows" className="mmp-button-secondary">Find my workflow →</Link><Link href="/start" className="mmp-button-secondary">Start from my documents</Link></div>
        </div>
      </section>
    </>
  )
}
