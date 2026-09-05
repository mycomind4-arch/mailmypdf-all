import { createElement } from 'react'
import { SMALL_BUSINESS_WORKFLOWS } from './domain/workflows'
import { createWorkflowDirectory } from '../../../../packages/design-system/src/index'

const WorkflowDirectory=createWorkflowDirectory(createElement)
const navLink={color:'var(--mmp-ink)',textDecoration:'none',fontSize:13,fontWeight:600} as const
function Header(){return <header className='mmp-site-header'><div className='mmp-site-header__inner'><a href='/' className='mmp-brand-lockup'><span className='mmp-brand-mark'>✉</span><span className='mmp-brand-copy'><strong className='mmp-brand-name'>MailMyPDF</strong><span className='mmp-brand-product'>Business</span></span></a><nav className='mmp-site-nav'><a href='/workflows' style={navLink}>Workflows</a><a href='/#lifecycle' style={navLink}>Business Lifecycle</a><a href='/#how' style={navLink}>How It Works</a><a href='/' style={navLink}>Mail a PDF</a></nav><div className='mmp-site-actions'><a href='/?workspace=1' className='mmp-button-primary'>Open Workspace</a></div></div></header>}
function Footer(){return <footer style={{borderTop:'1px solid var(--mmp-border)',background:'var(--mmp-surface)',padding:'34px 16px'}}><div style={{width:'min(100% - 2rem,var(--mmp-content-max))',margin:'0 auto',display:'flex',flexWrap:'wrap',justifyContent:'space-between',gap:20,color:'var(--mmp-ink-muted)',fontSize:13}}><div><strong style={{color:'var(--mmp-ink)'}}>MailMyPDF Business</strong><div style={{marginTop:5}}>Create → Schedule → Approve → Send → Track → Prove → Archive</div></div><div style={{display:'flex',gap:18,flexWrap:'wrap'}}><a href='/workflows'>Workflows</a><a href='/'>Public Home</a><a href='/?workspace=1'>Workspace</a></div></div></footer>}

export function BusinessWorkflowDirectory(){
  const categoryFor=(id:string)=>id.includes('payment')?'Payments & Receivables':id.includes('contract')?'Contracts':id.includes('compliance')?'Compliance':'Customer Correspondence'
  const items=SMALL_BUSINESS_WORKFLOWS.map(workflow=>({
    id:workflow.id,
    title:workflow.name,
    category:categoryFor(workflow.id),
    description:workflow.description,
    href:`/?workspace=1&workflow=${workflow.id}`,
    badge:workflow.risk,
    meta:`${workflow.requiresApproval?'Approval required':'Policy-gated'} · ${workflow.defaultMailClass} mail`,
    keywords:[workflow.id,workflow.name],
  }))
  const categories=[...new Set(items.map(item=>item.category))]
  return <div className='mmp-app'><Header/><WorkflowDirectory productName='MailMyPDF Business' title='Choose a governed business correspondence workflow.' description='The current production-oriented catalog contains the governed correspondence workflows that actually exist today. The broader formation-to-compliance lifecycle is the product direction; this directory does not pretend unfinished lifecycle workflows are already executable.' items={items} categories={categories.map(category=>({id:category,label:category}))} searchPlaceholder='Search payment reminder, demand, contract renewal, compliance, customer dispute…' helperTitle='Looking for formation, EIN, licensing, banking, or another lifecycle step?' helperDescription='Those connected lifecycle stages remain part of the release direction, but the public directory only presents the governed workflows implemented in the current catalog.' helperHref='/#lifecycle' helperLabel='See Business Lifecycle' steps={[
    {title:'Choose the workflow',description:'Start from the real business event: overdue balance, renewal, compliance obligation, or customer dispute.'},
    {title:'Create & schedule',description:'Prepare the correspondence and timing from the business record and recipient context.'},
    {title:'Approve when required',description:'Higher-risk correspondence stays behind the workflow’s explicit approval gate.'},
    {title:'Send, track & archive',description:'Use MailMyPDF fulfillment and retain the available mailing and proof record with the business.'},
  ]} finalTitle='Use the workflows that exist. Grow the lifecycle from verified business context.' finalDescription='Open the Business workspace with one of the current governed correspondence workflows, while the broader lifecycle graph expands behind the same business record.' finalHref='/?workspace=1' finalLabel='Open Business Workspace'/><Footer/></div>
}
