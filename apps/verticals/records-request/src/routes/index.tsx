import { createFileRoute, Link } from '@tanstack/react-router'
import { Eye, FileText, Mail, Search } from 'lucide-react'
import { createElement } from 'react'
import { recordsWorkflows } from '../workflows'
import { createTrustStrip, createVerticalHero } from '../../../../../packages/design-system/src/index'

const VerticalHero = createVerticalHero(createElement)
const SharedTrustStrip = createTrustStrip(createElement)

export const Route=createFileRoute('/')({component:Home})

function Home(){
  const featured=recordsWorkflows.slice(0,6)
  return <main className="shell">
    <VerticalHero
      theme="records-request"
      tone="dark"
      eyebrow="Access. Information. Accountability."
      title="Get the records you're entitled to."
      description="Request public records from federal, state, and local agencies with a focused workflow, review the exact request, and keep the request and mailing record tied to your account."
      imageSrc="/ecosystem-hero-sprite.jpg"
      imageAlt="Organized physical public-records files and folders"
      imageBackgroundSize="200% 300%"
      imageBackgroundPosition="0% 100%"
      actions={<>
        <Link className="btn primary" to="/workflows">Start a Records Request →</Link>
        <Link className="btn" to="/workflows">Find a Request Type</Link>
      </>}
      meta={<><span>Public-records workflows</span><span>Review before sending</span><span>MailMyPDF fulfillment</span></>}
    />
    <SharedTrustStrip items={[
      {icon:<FileText size={16}/>,title:'No printer required',description:'Prepare and mail online'},
      {icon:<Search size={16}/>,title:'Agency-specific guidance',description:'Start from the records objective'},
      {icon:<Eye size={16}/>,title:'You approve before mailing',description:'Review the exact request first'},
      {icon:<Mail size={16}/>,title:'Tracking & proof available',description:'Keep the mailing record together'},
    ]}/>
    <section>
      <div className="eyebrow">FEATURED</div>
      <div className="workflow-grid">{featured.map(w=><Link key={w.id} className="workflow-card" to="/workflows/$slug" params={{slug:w.id}}><h2>{w.name}</h2><p className="muted">{w.description}</p><span className="arrow">Open workflow →</span></Link>)}</div>
    </section>
  </main>
}
