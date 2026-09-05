import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

const claimTypes = [
  ['Insurance claim denial', 'Organize the denial, policy references, photos, estimates, correspondence, and other supporting records.'],
  ['Disability benefits denial', 'Build a source-linked record from the decision, medical evidence, work information, and appeal instructions.'],
  ['Health coverage denial', 'Map the denial reason to the records, authorization history, provider documentation, and appeal requirements.'],
  ['Unemployment decision', 'Keep the determination, work-separation facts, wage records, dates, and supporting evidence together.'],
  ['Workers’ compensation dispute', 'Organize the decision, medical and employment records, claim correspondence, and disputed issues.'],
  ['VA or public-benefit decision', 'Structure the decision, supporting records, evidence gaps, and reviewable response without inventing eligibility or outcomes.'],
]

const steps = [
  ['01', 'Start with the actual decision', 'Upload or review the denial, determination, or claim correspondence so the workflow is grounded in the source document.'],
  ['02', 'Build the evidence record', 'Organize facts, dates, claim identifiers, photos, records, estimates, reports, and correspondence around the issues actually in dispute.'],
  ['03', 'Prepare the response', 'Turn the reviewed record into clear, editable correspondence or a proof package. AI assistance stays advisory and must not invent facts or conclusions.'],
  ['04', 'Review before action', 'Verify names, dates, amounts, attachments, recipient instructions, and the exact document before approval.'],
  ['05', 'Send and preserve proof', 'When mailing is appropriate, choose a MailMyPDF delivery option and keep tracking and proof with the matter.'],
]

export function PublicLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="mmp-app">
      <SiteHeader />
      <main>
        <VerticalHero
          theme="claim-proof"
          tone="light"
          eyebrow="Evidence-first claim documentation"
          title="Turn a claim denial into an organized record."
          description="Start with the decision you actually received. Claim Proof helps you organize the facts and evidence, prepare reviewable correspondence or a proof package, and keep mailing and delivery records together when you choose to send."
          imageSrc="/hero.svg"
          imageAlt="Claim documents, supporting evidence, and an organized proof package"
          actions={<><button type="button" onClick={onStart} className="mmp-button-primary">Start a Claim Proof workflow →</button><a href="#claim-types" className="mmp-button-secondary">See supported claim situations</a></>}
          meta={<><span>Evidence before conclusions</span><span>You review the final document</span><span>MailMyPDF fulfillment available</span></>}
        />

        <SharedTrustStrip items={[
          { title: 'Source-grounded', description: 'Start from the denial or decision instead of a blank page' },
          { title: 'Evidence organized', description: 'Keep records tied to the issues they support' },
          { title: 'Human approval', description: 'Review the exact document before consequential action' },
          { title: 'Proof retained', description: 'Keep mailing, tracking, and delivery records with the matter' },
        ]} />

        <section id="claim-types" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container">
            <div className="mmp-eyebrow">Claim situations</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.75rem)', maxWidth: 820, margin: '16px 0 0' }}>Build the record around the decision you received.</h2>
            <p style={{ maxWidth: 720, color: 'var(--mmp-ink-muted)', lineHeight: 1.75, marginTop: 20 }}>Different claims use different procedures, deadlines, evidence, and recipients. Claim Proof keeps those differences in the workflow definition while the preparation, review, approval, mailing, and proof experience stays consistent.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, marginTop: 34 }}>
              {claimTypes.map(([title, description]) => <article key={title} className="mmp-card" style={{ padding: 24 }}><div className="mmp-eyebrow">Claim Proof</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 27, fontWeight: 400, margin: '12px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container">
            <div className="mmp-eyebrow">How it works</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.75rem)', maxWidth: 760, margin: '16px 0 0' }}>Decision → evidence → response → proof.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginTop: 34 }}>
              {steps.map(([number, title, text]) => <article key={number} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">{number}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="trust" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            <div><div className="mmp-eyebrow">Control</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.4rem,5vw,4.25rem)', margin: '14px 0 0' }}>The record stays reviewable.</h2></div>
            <div className="mmp-card" style={{ padding: 26 }}><strong>Facts remain distinguishable from suggestions.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Claim Proof is designed to organize user-supplied and document-extracted information without presenting generated text as verified fact.</p></div>
            <div className="mmp-card" style={{ padding: 26 }}><strong>Nothing should imply a guaranteed outcome.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>The product prepares documents and records. It does not promise that an insurer, agency, administrator, or reviewer will change a decision.</p></div>
          </div>
        </section>

        <section id="faq" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)' }}>
          <div className="mmp-container mmp-reading">
            <div className="mmp-eyebrow">Questions</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', margin: '14px 0 26px' }}>What Claim Proof does — and does not do.</h2>
            {[
              ['Is Claim Proof legal or claims advice?', 'No. Claim Proof is a document-preparation, evidence-organization, and mailing tool. It does not provide legal advice, claims representation, or guarantee an outcome.'],
              ['Can I review everything before it is sent?', 'Yes. The workflow is designed around review and explicit approval before mailing or another consequential action.'],
              ['Does it work with more than insurance claims?', 'The current product is designed around multiple claim and benefits situations. The workflow you choose determines the questions, evidence structure, and response requirements.'],
              ['Can I mail the finished packet?', 'Where a workflow supports mailing, MailMyPDF fulfillment can print and send the approved packet and retain the available tracking and proof record.'],
            ].map(([q,a]) => <details key={q} className="mmp-card" style={{ padding: 20, marginTop: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q}</summary><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>{a}</p></details>)}
          </div>
        </section>

        <section id="start" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}>
          <div className="mmp-container" style={{ textAlign: 'center' }}>
            <div className="mmp-eyebrow" style={{ color: '#d9c9ad' }}>Claim Proof · MailMyPDF</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.8rem,6vw,5rem)', maxWidth: 820, margin: '16px auto 0', color: '#fff' }}>Build the record before you build the argument.</h2>
            <p style={{ maxWidth: 650, margin: '20px auto 0', lineHeight: 1.75, color: 'rgba(255,255,255,.72)' }}>Open the guided workspace, work from the actual denial or decision, and keep evidence, correspondence, approval, and proof in one matter.</p>
            <button type="button" onClick={onStart} className="mmp-button-secondary" style={{ marginTop: 28 }}>Open the guided workspace →</button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
