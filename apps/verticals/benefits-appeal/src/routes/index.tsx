import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Eye, FileText, Mail, ShieldCheck } from 'lucide-react'
import { createElement } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { workflows } from '@/domain/workflows'
import { createTrustStrip, createVerticalHero } from '../../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const featured = Object.values(workflows).slice(0, 6)

  return <main>
    <SiteHeader />
    <VerticalHero
      theme='benefits-appeal'
      tone='dark'
      eyebrow="Protect the benefits you've earned"
      title='Appeal with clarity and confidence.'
      description='Use a focused workflow for a denied benefit, organize the record and supporting evidence, prepare a reviewable response, and choose optional MailMyPDF mailing with proof.'
      imageSrc='/hero.svg'
      imageAlt='Benefits and Social Security documents representing a benefits appeal'
      imagePosition='center'
      actions={<>
        <Link className='btn btn-primary' to='/workflows'>Start a Benefits Appeal <ArrowRight size={16} /></Link>
        <Link className='btn' to='/workflows'>Find Your Appeal</Link>
      </>}
      meta={<><span>Benefits-focused workflows</span><span>Evidence organization</span><span>Review before mailing</span></>}
    />

    <SharedTrustStrip items={[
      { icon: <FileText size={16}/>, title: 'No printer required', description: 'Prepare and mail online' },
      { icon: <ShieldCheck size={16}/>, title: 'Evidence-focused workflow', description: 'Build from the decision and your records' },
      { icon: <Eye size={16}/>, title: 'You approve before mailing', description: 'Review the exact appeal first' },
      { icon: <Mail size={16}/>, title: 'Tracking & proof available', description: 'Keep the mailing record together' },
    ]}/>

    <section className='section-tight'>
      <div className='container'>
        <div className='eyebrow'>Featured workflows</div>
        <h2 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 'clamp(36px,5vw,56px)', fontWeight: 400, lineHeight: 1, margin: '12px 0 0' }}>Start with the decision you received.</h2>
        <p className='muted' style={{ maxWidth: 720, lineHeight: 1.7, marginTop: 16 }}>Benefits Appeal keeps public workflow discovery open while protecting the private intake, uploaded documents, analysis, drafts, and mailing record behind your MailMyPDF account.</p>
        <div className='grid-workflows' style={{ marginTop: 28 }}>
          {featured.map(w => <Link key={w.id} className='card' style={{ padding: 22 }} to={`/workflows/${w.id}`}>
            <div className='badge badge-family'>Benefits Appeal</div>
            <h3 style={{ margin: '14px 0 8px', fontFamily: 'var(--mmp-font-display)', fontSize: 25, fontWeight: 400 }}>{w.title}</h3>
            <p className='muted' style={{ lineHeight: 1.6 }}>{w.description}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, color: 'var(--mmp-accent)', fontWeight: 700 }}>View workflow <ArrowRight size={14}/></span>
          </Link>)}
        </div>
        <Link className='btn btn-primary' style={{ marginTop: 28 }} to='/workflows'>Explore all workflows <ArrowRight size={16}/></Link>
      </div>
    </section>

    <section className='section-tight' style={{ background: 'var(--mmp-paper-deep)' }}>
      <div className='container'>
        <div className='eyebrow'>How it works</div>
        <h2 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 'clamp(36px,5vw,56px)', fontWeight: 400, lineHeight: 1, margin: '12px 0 0' }}>From adverse decision to documented response.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16, marginTop: 30 }}>
          {[
            ['01','Understand','Start with the actual denial or adverse decision and identify what requires a response.'],
            ['02','Organize','Collect the facts, evidence, dates, and supporting records that belong in the appeal.'],
            ['03','Prepare','Build a structured response from the reviewed record instead of starting from a blank page.'],
            ['04','Review','Check the exact appeal before any consequential action moves forward.'],
            ['05','Send & prove','Choose mailing when appropriate and retain the resulting tracking and proof record.'],
          ].map(([n,title,text]) => <div key={n} className='card' style={{ padding: 22 }}><div className='eyebrow'>{n}</div><h3 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 24, margin: '10px 0 8px', fontWeight: 400 }}>{title}</h3><p className='muted' style={{ lineHeight: 1.6, margin: 0 }}>{text}</p></div>)}
        </div>
      </div>
    </section>

    <section className='section'>
      <div className='container' style={{ textAlign: 'center' }}>
        <div className='eyebrow'>Benefits Appeal · MailMyPDF</div>
        <h2 style={{ fontFamily: 'var(--mmp-font-display)', fontSize: 'clamp(40px,6vw,64px)', fontWeight: 400, lineHeight: 1, maxWidth: 760, margin: '14px auto 0' }}>Protect the record. Prepare the appeal. Keep the proof.</h2>
        <p className='muted' style={{ maxWidth: 640, margin: '18px auto 0', lineHeight: 1.7 }}>Choose the workflow that matches the decision you received and continue into the private account-scoped appeal workspace.</p>
        <Link className='btn btn-primary' style={{ marginTop: 28 }} to='/workflows'>Find my appeal <ArrowRight size={16}/></Link>
      </div>
    </section>
    <SiteFooter />
  </main>
}
