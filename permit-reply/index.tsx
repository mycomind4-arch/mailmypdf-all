import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

const situations = [
  ['Permit denial', 'Organize the denial, application details, stated reasons, plan set, supporting records, and requested reconsideration or next action.'],
  ['Plan review comments', 'Track each reviewer comment, the cited source, your response, revised documents, and anything that still needs verification.'],
  ['Failed inspection', 'Document the inspection result, items requiring correction, photos or records, completed work, and reinspection request.'],
  ['Stop-work or violation notice', 'Start from the notice, stated conditions and dates, property and permit context, evidence, and the response you intend to send.'],
  ['Variance or zoning decision', 'Keep the application, decision, conditions, supporting facts, exhibits, and review or reconsideration correspondence together.'],
  ['Certificate / closeout issue', 'Organize outstanding items, approvals, inspections, corrections, and correspondence needed to document project closeout.'],
]

export function PublicLanding({ onStart }: { onStart: () => void }) {
  return <div className="mmp-app">
    <SiteHeader />
    <main>
      <VerticalHero
        theme="permit-reply"
        tone="light"
        eyebrow="Permits · plan review · inspections · zoning"
        title="Turn permit correspondence into a documented response."
        description="Start with the notice, denial, correction list, inspection result, or planning decision you actually received. Permit Reply helps organize project facts and supporting documents, prepare reviewable correspondence, and keep mailing and delivery proof with the matter."
        imageSrc="/hero.svg"
        imageAlt="Permit correspondence and architectural plans on a project desk"
        actions={<><button type="button" onClick={onStart} className="mmp-button-primary">Start a Permit Reply workflow →</button><a href="#notice-types" className="mmp-button-secondary">Find my situation</a></>}
        meta={<><span>Source notice first</span><span>Local requirements stay reviewable</span><span>Not legal or engineering advice</span></>}
      />
      <SharedTrustStrip items={[
        { title: 'Project context preserved', description: 'Keep property, permit, application, agency, and reviewer details together' },
        { title: 'Comment-by-comment structure', description: 'Tie corrections and evidence to the item they address' },
        { title: 'Review before sending', description: 'Verify facts, code references, attachments, and recipient instructions' },
        { title: 'Mailing proof available', description: 'Retain tracking and delivery records with the project matter' },
      ]}/>

      <section id="notice-types" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">Permit and planning situations</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.7rem)', maxWidth: 860, margin: '16px 0 0' }}>Use the workflow built for the document in front of you.</h2>
          <p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.75, maxWidth: 760, marginTop: 20 }}>A plan-review correction is not the same job as a failed inspection, permit denial, zoning decision, or stop-work notice. The public layer helps route the matter; the workspace carries the project-specific record forward.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(285px,1fr))', gap: 16, marginTop: 34 }}>
            {situations.map(([title, text]) => <article key={title} className="mmp-card" style={{ padding: 24 }}><div className="mmp-eyebrow">Permit Reply</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 28, fontWeight: 400, margin: '12px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">How it works</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.5rem)', margin: '16px 0 0' }}>Notice → project facts → evidence → reply → proof.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: 34 }}>
            {[
              ['01','Identify','Start from the agency document and classify the permit, planning, zoning, inspection, or enforcement situation.'],
              ['02','Verify','Review permit numbers, property, authority, dates, cited items, reviewer comments, and requested action.'],
              ['03','Organize','Attach plans, photos, permits, reports, correction notes, prior approvals, and other project records to the issues they support.'],
              ['04','Prepare','Build a clear, editable response from the reviewed project record rather than inventing facts or technical conclusions.'],
              ['05','Approve + send','Review the exact correspondence and attachments before mailing or another consequential action.'],
            ].map(([n,title,text]) => <article key={n} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="code" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 24 }}>
          <div><div className="mmp-eyebrow">Authority and code references</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.3rem)', margin: '14px 0 0' }}>Treat the local record as controlling.</h2><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.75 }}>Model codes and common procedures can provide context, but adoption, amendments, review standards, filing methods, deadlines, and appeal rights vary by jurisdiction and project. Permit Reply should keep any cited rule tied to an authoritative source and subject to user review.</p></div>
          <div className="mmp-card" style={{ padding: 26 }}><strong>Designed to avoid invented technical conclusions.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>The product can help organize reviewer comments and user-supplied evidence. It does not replace an architect, engineer, contractor, code official, or attorney where professional judgment is required.</p></div>
        </div>
      </section>

      <section id="faq" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)' }}><div className="mmp-container mmp-reading"><div className="mmp-eyebrow">Questions</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', margin: '14px 0 24px' }}>What Permit Reply is built to do.</h2>{[
        ['Is this legal, architectural, or engineering advice?', 'No. Permit Reply is a document-organization, correspondence-preparation, and mailing tool. It does not provide legal, architectural, engineering, or code-official services.'],
        ['Can I respond to plan-review comments one by one?', 'That is the intended structure: keep each comment, your response, supporting document, and verification status connected.'],
        ['Can it help with a denial or inspection result?', 'Yes. Different workflows can organize denials, inspection findings, correction requests, zoning or planning decisions, and related correspondence.'],
        ['Can I review before anything is mailed?', 'Yes. The workflow is designed around explicit review and approval before mailing or another consequential action.'],
      ].map(([q,a]) => <details key={q} className="mmp-card" style={{ padding: 20, marginTop: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q}</summary><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>{a}</p></details>)}</div></section>

      <section id="start" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}><div className="mmp-container" style={{ textAlign: 'center' }}><div className="mmp-eyebrow" style={{ color: '#dfd3ba' }}>Permit Reply · MailMyPDF</div><h2 className="mmp-display" style={{ color: '#fff', fontSize: 'clamp(2.9rem,6vw,5.1rem)', maxWidth: 850, margin: '16px auto 0' }}>Keep the project record as organized as the plans.</h2><p style={{ color: 'rgba(255,255,255,.72)', maxWidth: 650, margin: '20px auto 0', lineHeight: 1.75 }}>Open the guided workspace with the notice or decision you received and continue from the source record.</p><button type="button" onClick={onStart} className="mmp-button-secondary" style={{ marginTop: 28 }}>Open Permit Reply →</button></div></section>
    </main>
    <SiteFooter />
  </div>
}
