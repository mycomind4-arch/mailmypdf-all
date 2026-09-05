import { createElement } from 'react'
import { createTrustStrip, createVerticalHero } from '../../../../packages/design-system/src/index'
import { SMALL_BUSINESS_WORKFLOWS } from './domain/workflows'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

const lifecycle = [
  ['01', 'Formation', 'Establish the business record and preserve the documents that define the entity and its owners.'],
  ['02', 'Tax identity', 'Carry verified business identity forward into EIN, tax-account, and related administrative work.'],
  ['03', 'Registrations & licenses', 'Track the registrations, permits, accounts, renewals, and agency correspondence the business depends on.'],
  ['04', 'Banking & operations', 'Keep business identity, authorized parties, addresses, and operating records consistent across the systems that use them.'],
  ['05', 'Contracts & correspondence', 'Manage recurring notices, payment communication, renewals, disputes, and other important outbound documents.'],
  ['06', 'Ongoing compliance', 'Turn recurring dates and business events into reviewable tasks, approvals, correspondence, mailing, and proof.'],
]

const productLoop = [
  ['Create', 'Start from a real business event, document, obligation, or recipient.'],
  ['Schedule', 'Set the timing once the inputs and intended action are clear.'],
  ['Approve', 'Keep higher-risk or consequential correspondence behind an explicit human gate.'],
  ['Send', 'Use MailMyPDF fulfillment when physical mailing is the right channel.'],
  ['Track', 'Keep available carrier and fulfillment status with the business record.'],
  ['Prove', 'Retain the document, mailing record, and available delivery evidence together.'],
  ['Archive', 'Preserve correspondence history so the next workflow starts with context instead of a blank page.'],
]

export function PublicLanding() {
  return (
    <div className="mmp-app">
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'color-mix(in srgb, var(--mmp-paper) 94%, transparent)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--mmp-border)' }}>
        <div className="mmp-container" style={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'baseline', gap: 9, textDecoration: 'none', color: 'var(--mmp-ink)' }}>
            <strong style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 24, fontWeight: 400 }}>MailMyPDF</strong>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--mmp-accent)', fontWeight: 700 }}>Business</span>
          </a>
          <nav aria-label="Main navigation" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href="https://mailmypdf.pages.dev/start" style={navLink}>Mail a PDF</a>
            <a href="#workflows" style={navLink}>Workflows</a>
            <a href="#lifecycle" style={navLink}>Business Lifecycle</a>
            <a href="#how" style={navLink}>How It Works</a>
            <a href="#trust" style={navLink}>Security & Trust</a>
            <a href="/?workspace=1" className="mmp-button-primary" style={{ minHeight: 38, padding: '.5rem .8rem' }}>Open Workspace</a>
          </nav>
        </div>
      </header>

      <main>
        <VerticalHero
          theme="small-business"
          tone="light"
          eyebrow="Business records · correspondence · scheduling · proof"
          title="Keep the next business step connected to the last one."
          description="MailMyPDF Business is being built as a connected operating layer for important small-business documents and correspondence. Start with verified business facts, carry them forward, schedule recurring work, require approval where it matters, and preserve what was sent and when."
          imageSrc="/hero.svg"
          imageAlt="Small-business formation, tax identity, contract, compliance, and mailing records on a desk"
          actions={<><a href="/?workspace=1" className="mmp-button-primary">Open the Business Workspace →</a><a href="#lifecycle" className="mmp-button-secondary">See the connected lifecycle</a></>}
          meta={<><span>Human approval for consequential actions</span><span>MailMyPDF fulfillment</span><span>Business record carried forward</span></>}
        />

        <SharedTrustStrip items={[
          { title: 'One business record', description: 'Reuse verified identity and operating context instead of re-entering it for every task' },
          { title: 'Governed workflows', description: 'Triggers and automation stay bounded by workflow rules and approval gates' },
          { title: 'Correspondence history', description: 'Keep drafts, recipients, schedules, mailing status, and proof together' },
          { title: 'Replaceable integrations', description: 'CRM, scheduler, automation, and workflow providers stay behind explicit boundaries' },
        ]} />

        <section id="lifecycle" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container">
            <div className="mmp-eyebrow">Connected business lifecycle</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.7rem,5.5vw,5rem)', maxWidth: 940, margin: '16px 0 0' }}>Formation should unlock the next work — not disappear into a folder.</h2>
            <p style={{ maxWidth: 780, color: 'var(--mmp-ink-muted)', lineHeight: 1.8, marginTop: 22 }}>The release direction is a workflow graph: completed, verified business steps create reusable context for the steps that follow. The lifecycle below is the product model we are building toward; it does not claim that every formation, tax, banking, licensing, or compliance workflow is executable in the current prototype.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginTop: 36 }}>
              {lifecycle.map(([n,title,text], index) => <article key={n} className="mmp-card" style={{ padding: 23, position: 'relative' }}><div className="mmp-eyebrow">{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 28, fontWeight: 400, margin: '11px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p>{index < lifecycle.length - 1 && <span aria-hidden="true" style={{ position: 'absolute', right: 12, top: 16, color: 'var(--mmp-accent)', opacity: .5 }}>→</span>}</article>)}
            </div>
          </div>
        </section>

        <section id="workflows" style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-paper-deep)', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container">
            <div className="mmp-eyebrow">Current governed workflow foundation</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.7rem)', maxWidth: 880, margin: '16px 0 0' }}>Recurring business correspondence already has a common engine.</h2>
            <p style={{ maxWidth: 760, color: 'var(--mmp-ink-muted)', lineHeight: 1.75, marginTop: 20 }}>The current domain catalog defines the operating correspondence workflows below. Each carries an explicit risk level, approval policy, default mail class, trigger, and governed action sequence.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 34 }}>
              {SMALL_BUSINESS_WORKFLOWS.map(workflow => <article key={workflow.id} className="mmp-card" style={{ padding: 24 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><div className="mmp-eyebrow">Business workflow</div><span className="mmp-status" style={{ background: 'var(--mmp-accent-soft)', color: 'var(--mmp-accent)' }}>{workflow.risk}</span></div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 29, fontWeight: 400, margin: '12px 0 8px' }}>{workflow.name}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{workflow.description}</p><div style={{ marginTop: 18, paddingTop: 15, borderTop: '1px solid var(--mmp-border)', color: 'var(--mmp-ink-muted)', fontSize: 13, lineHeight: 1.6 }}>{workflow.requiresApproval ? 'Approval required' : 'Can proceed when required inputs and policy checks are satisfied'} · {workflow.defaultMailClass} mail</div></article>)}
            </div>
            <a href="/?workspace=1" className="mmp-button-primary" style={{ marginTop: 28 }}>Open governed workflows →</a>
          </div>
        </section>

        <section id="how" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container">
            <div className="mmp-eyebrow">The operating loop</div>
            <h2 className="mmp-display" style={{ fontSize: 'clamp(2.6rem,5vw,4.7rem)', maxWidth: 850, margin: '16px 0 0' }}>Create → Schedule → Approve → Send → Track → Prove → Archive.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginTop: 34 }}>
              {productLoop.map(([title,text], index) => <article key={title} className="mmp-card" style={{ padding: 22 }}><div className="mmp-eyebrow">0{index + 1}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400, margin: '10px 0 8px' }}>{title}</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.65, margin: 0 }}>{text}</p></article>)}
            </div>
          </div>
        </section>

        <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-surface)', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 22, alignItems: 'start' }}>
            <div><div className="mmp-eyebrow">Business command center</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.4rem)', margin: '14px 0 0' }}>The workspace is the operating layer behind the public pages.</h2><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.8 }}>The existing workspace brings correspondence, schedule, contacts, templates, automation, approval-oriented workflows, and proof-archive concepts into one interface. The public landing page does not replace that work; it routes users into it with the correct product context.</p></div>
            <div className="mmp-card" style={{ padding: 26 }}>{['Overview and command center','Correspondence queue','Scheduling and recurring rules','Contacts and recipients','Reusable templates','Governed automation sequences','Approval-oriented workflow execution','Tracking and proof archive foundations'].map(item => <div key={item} style={{ padding: '11px 0', borderBottom: '1px solid var(--mmp-border)', color: 'var(--mmp-ink-muted)' }}>✓ {item}</div>)}</div>
          </div>
        </section>

        <section id="trust" style={{ padding: 'var(--mmp-section-space) 0', borderBottom: '1px solid var(--mmp-border)' }}>
          <div className="mmp-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
            <div><div className="mmp-eyebrow">Safety and control</div><h2 className="mmp-display" style={{ fontSize: 'clamp(2.5rem,5vw,4.3rem)', margin: '14px 0 0' }}>Automation should reduce repetition, not remove accountability.</h2></div>
            <div className="mmp-card" style={{ padding: 26 }}><strong>Consequential actions stay gated.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Higher-risk workflow definitions require approval before sending. The shared platform should preserve the difference between drafting, approval, payment, mailing, tracking, and proof.</p></div>
            <div className="mmp-card" style={{ padding: 26 }}><strong>Business requirements remain source-dependent.</strong><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.7 }}>Formation, tax, licensing, employment, contract, and regulatory requirements vary by business and jurisdiction. MailMyPDF Business is a workflow and correspondence platform, not a substitute for legal, tax, accounting, or licensed professional advice.</p></div>
          </div>
        </section>

        <section style={{ padding: 'var(--mmp-section-space) 0', background: 'var(--mmp-brand)', color: '#fff' }}>
          <div className="mmp-container" style={{ textAlign: 'center' }}>
            <div className="mmp-eyebrow" style={{ color: '#cfe0d8' }}>MailMyPDF Business</div>
            <h2 className="mmp-display" style={{ color: '#fff', fontSize: 'clamp(3rem,6vw,5.3rem)', maxWidth: 900, margin: '16px auto 0' }}>A business should remember what it already knows.</h2>
            <p style={{ color: 'rgba(255,255,255,.72)', maxWidth: 680, margin: '20px auto 0', lineHeight: 1.75 }}>Open the current workspace for correspondence and governed mailing workflows. As the lifecycle graph expands, the same verified business record becomes the starting point for the next workflow.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 28 }}><a href="/?workspace=1" className="mmp-button-secondary">Open Business Workspace →</a><a href="https://mailmypdf.pages.dev/start" className="mmp-button-secondary">Mail a PDF</a></div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--mmp-border)', background: 'var(--mmp-paper)', padding: '32px 0' }}><div className="mmp-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}><div><strong style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 22, fontWeight: 400 }}>MailMyPDF Business</strong><div style={{ marginTop: 5, color: 'var(--mmp-ink-muted)', fontSize: 13 }}>Business correspondence, workflow, mailing, and proof.</div></div><nav style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}><a href="https://mailmypdf.pages.dev/start" style={navLink}>Mail a PDF</a><a href="https://mailmypdf.pages.dev/privacy" style={navLink}>Privacy</a><a href="https://mailmypdf.pages.dev/terms" style={navLink}>Terms</a></nav></div></footer>
    </div>
  )
}

const navLink: React.CSSProperties = { fontSize: 13, fontWeight: 550, color: 'var(--mmp-ink-muted)', textDecoration: 'none', whiteSpace: 'nowrap' }
