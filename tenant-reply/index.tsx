import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

const situations = [
  ['Landlord notice response', 'Start from the actual notice, property and tenancy details, stated reason, dates, lease references, and the response you want to prepare.'],
  ['Repair correspondence', 'Document the condition, prior requests, photos, dates, communications, access history, and the repair request you intend to send.'],
  ['Habitability documentation', 'Organize condition evidence and correspondence into a reviewable record without turning generated text into a legal conclusion.'],
  ['Security-deposit dispute', 'Keep the move-out record, deductions, photos, receipts, itemization, dates, and correspondence together.'],
  ['Rent or lease correspondence', 'Document the notice, lease terms, amounts, dates, prior communications, and the factual response or question you intend to send.'],
  ['Entry and access correspondence', 'Record the notice, requested date and purpose, prior access communications, and the response you intend to make.'],
]

export function PublicLanding({ onStart }: { onStart: () => void }) {
  return <div className="mmp-app">
    <SiteHeader />
    <main>
      <VerticalHero
        theme="tenant-reply"
        tone="light"
        eyebrow="Tenant notices · repairs · deposits · documented correspondence"
        title="Turn housing correspondence into a record you can review."
        description="Start with the notice, lease, repair issue, deposit statement, or other source document. Tenant Reply helps organize the facts and evidence, prepare editable correspondence, and preserve mailing and delivery proof when you choose to send."
        imageSrc="/hero.svg"
        imageAlt="Tenant correspondence, lease records, apartment keys, and mailing documents"
        actions={<><button type="button" onClick={onStart} className="mmp-button-primary">Start a Tenant Reply workflow →</button><a href="#notice-types" className="mmp-button-secondary">Find my situation</a></>}
        meta={<><span>Source documents first</span><span>You review the response</span><span>Not a law firm</span></>}
      />

      <SharedTrustStrip items={[
        { title: 'Tenancy context retained', description: 'Keep property, parties, lease, notice, and correspondence together' },
        { title: 'Evidence stays connected', description: 'Photos, receipts, messages, notices, and records remain tied to the issue' },
        { title: 'Human approval', description: 'Review the exact correspondence before mailing or another consequential action' },
        { title: 'Proof available', description: 'Keep tracking and delivery records with the housing matter' },
      ]}/>

      <section id="notice-types" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">Housing situations</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.7rem)', maxWidth: 850, margin: '16px 0 0' }}>Start from the document or condition that created the matter.</h2>
          <p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.75, maxWidth: 760, marginTop: 20 }}>A repair request, deposit dispute, rent notice, access issue, and formal landlord notice should not be handled as the same correspondence. Tenant Reply keeps the public experience simple while the underlying workflow carries the right facts and evidence structure.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(285px,1fr))', gap: 16, marginTop: 34 }}>
            {situations.map(([title,text]) => <article key={title} className="mmp-card" style={{ padding: 24 }}><div className="mmp-eyebrow">Tenant Reply</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 28, fontWeight: 400, margin: '12px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container">
          <div className="mmp-eyebrow">How it works</div>
          <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.5rem)', maxWidth: 820, margin: '16px 0 0' }}>Notice or issue → facts → evidence → reply → proof.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: 34 }}>
            {[
              ['01','Identify','Start from the actual notice, lease, statement, repair issue, or other document that defines the matter.'],
              ['02','Verify','Review names, property, dates, amounts, lease references, stated reasons, and any instructions in the source record.'],
              ['03','Organize','Keep photos, receipts, messages, repair records, payment records, inspection material, and prior correspondence connected to the issues they support.'],
              ['04','Prepare','Build clear, editable correspondence from the reviewed facts instead of inventing legal conclusions or missing details.'],
              ['05','Approve + send','Review the exact correspondence and attachments before mailing; retain available tracking and delivery proof.'],
            ].map(([n,title,text]) => <article key={n} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="trust" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
          <div><div className="mmp-eyebrow">Safety boundary</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.3rem)', margin: '14px 0 0' }}>Housing law varies. The source record stays visible.</h2></div>
          <div className="mmp-card" style={{ padding: 26 }}><strong>No invented deadlines or rights.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Notice periods, procedures, rent rules, deposit requirements, entry rules, and remedies depend on jurisdiction and facts. Tenant Reply should surface uncertainty and keep authoritative requirements separate from generated drafting.</p></div>
          <div className="mmp-card" style={{ padding: 26 }}><strong>Not legal advice.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Tenant Reply is a document-organization, correspondence-preparation, and mailing tool. It does not provide legal representation or guarantee any housing outcome.</p></div>
        </div>
      </section>

      <section id="faq" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)' }}><div className="mmp-container mmp-reading"><div className="mmp-eyebrow">Questions</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', margin: '14px 0 24px' }}>Built for documented correspondence.</h2>{[
        ['Can I respond to a landlord notice?', 'Tenant Reply can help organize the source notice, your facts and documents, and a reviewable response. The underlying workflow should determine the appropriate fields and safety guidance.'],
        ['Can I document a repair issue?', 'Yes. A repair-focused workflow can keep condition photos, dates, prior requests, access history, and correspondence together.'],
        ['Does Tenant Reply tell me my legal rights?', 'It is not a substitute for legal advice. Any legal or procedural information should be tied to authoritative sources and reviewed for the user’s jurisdiction and facts.'],
        ['Can I review before mailing?', 'Yes. The intended product flow requires review and approval of the exact correspondence before mailing or another consequential action.'],
      ].map(([q,a]) => <details key={q} className="mmp-card" style={{ padding: 20, marginTop: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q}</summary><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>{a}</p></details>)}</div></section>

      <section id="start" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}><div className="mmp-container" style={{ textAlign: 'center' }}><div className="mmp-eyebrow" style={{ color: '#e6d0c9' }}>Tenant Reply · MailMyPDF</div><h2 className="mmp-display" style={{ color: '#fff', fontSize: 'clamp(2.9rem,6vw,5.1rem)', maxWidth: 850, margin: '16px auto 0' }}>Keep the notice, your response, and the proof in one matter.</h2><p style={{ color: 'rgba(255,255,255,.72)', maxWidth: 650, margin: '20px auto 0', lineHeight: 1.75 }}>Open the guided workspace with the document or housing issue you are responding to.</p><button type="button" onClick={onStart} className="mmp-button-secondary" style={{ marginTop: 28 }}>Open Tenant Reply →</button></div></section>
    </main>
    <SiteFooter />
  </div>
}
