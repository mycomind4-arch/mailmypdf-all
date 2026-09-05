import { createFileRoute, Link } from '@tanstack/react-router'
import { createElement } from 'react'
import { FileText, ShieldCheck, Search, Mail, ArrowRight } from 'lucide-react'
import { createTrustStrip, createVerticalHero } from '../../../../../packages/design-system/src/index'
import { PublicFooter, PublicHeader } from '../components/public-chrome'

const VerticalHero=createVerticalHero(createElement)
const TrustStrip=createTrustStrip(createElement)
const featured=[
  ['respond-to-code-violation-notice','Respond to a Code Violation Notice','Notices & violations','Organize the notice, issues, facts, and response record.'],
  ['request-additional-time-to-correct-violations','Request Additional Time to Correct','Extensions & compliance','Prepare a documented request for additional correction time.'],
  ['submit-proof-of-correction','Submit Proof of Correction','Evidence & correction','Package correction evidence and the accompanying submission.'],
  ['challenge-inspection-findings','Challenge Inspection Findings','Inspection & findings','Respond to disputed inspection findings with an organized record.'],
  ['request-administrative-hearing','Request an Administrative Hearing','Hearings & appeals','Prepare the request and supporting matter record.'],
  ['request-case-closure','Request Case Closure','Case status & closure','Document the basis for asking the agency to close the matter.'],
] as const

export const Route=createFileRoute('/')({component:Home})
function Home(){return <main>
  <PublicHeader/>
  <VerticalHero theme='code-enforcement' tone='dark' eyebrow='Code Enforcement · Respond with a record' title='Turn a code enforcement notice into documented action.' description='Start from the notice, inspection request, violation, citation, or abatement action. Organize the facts and evidence, prepare a reviewable response, and keep the mailing and proof record together.' imageSrc='/hero.svg' imageAlt='Residential property and municipal inspection documents' actions={<><Link className='mmp-button-primary' to='/workflows'>Find a Workflow <ArrowRight size={16}/></Link><a className='mmp-button-secondary' href='/'>Mail a PDF</a></>} meta={<><span>Public workflow discovery</span><span>Private execution</span><span>Review before mailing</span></>}/>
  <TrustStrip items={[
    {icon:<FileText size={16}/>,title:'Notice-first workflow',description:'Start from the document you received'},
    {icon:<Search size={16}/>,title:'Evidence organized',description:'Keep facts and supporting records together'},
    {icon:<ShieldCheck size={16}/>,title:'Review before action',description:'You control the final response'},
    {icon:<Mail size={16}/>,title:'Mailing & proof options',description:'Available through MailMyPDF'},
  ]}/>
  <section className='mmp-section'><div className='mmp-section__inner'><div className='mmp-section-heading'><div><div className='mmp-directory__eyebrow'>Common situations</div><h2>Start with the action the agency took.</h2></div><p>Code Enforcement is organized around the exact notice or procedural step in front of you rather than one generic response form.</p></div><div className='mmp-workflow-grid'>{featured.map(([id,title,category,description])=><article className='mmp-workflow-card' key={id}><div className='mmp-workflow-card__body'><div className='mmp-directory__eyebrow'>{category}</div><h3>{title}</h3><p>{description}</p><Link className='mmp-workflow-card__action' to='/workflows/$workflowId' params={{workflowId:id}}>View workflow →</Link></div></article>)}</div><div style={{marginTop:28}}><Link to='/workflows' className='mmp-button-primary'>Browse all code enforcement workflows →</Link></div></div></section>
  <section id='how' className='mmp-section mmp-section--tight' style={{background:'var(--mmp-paper-deep)'}}><div className='mmp-section__inner'><div className='mmp-section-heading'><div><div className='mmp-directory__eyebrow'>How it works</div><h2>From notice to documented response.</h2></div><p>The workflow keeps the notice, property facts, evidence, draft, approval, mailing, and proof stages connected.</p></div><div className='mmp-process-grid'>{[['1','Upload the notice','Start from the agency document or inspection request.'],['2','Organize facts','Capture dates, allegations, property details, and evidence.'],['3','Prepare response','Use the workflow matched to the agency action.'],['4','Review & approve','Check the exact response and attachments before sending.'],['5','Send & retain proof','Download it or use mailing, tracking, and proof options.']].map(([n,t,d])=><div className='mmp-process-step' key={n}><span className='mmp-process-step__number'>{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></div></section>
  <section className='mmp-section'><div className='mmp-section__inner'><div className='mmp-final-cta'><div className='mmp-final-cta__inner'><div><h2>Build the response around the record.</h2><p>Choose the workflow that matches the notice or action you received and keep each consequential step reviewable.</p></div><Link className='mmp-button-primary' to='/workflows'>Find My Workflow →</Link></div></div></div></section>
  <PublicFooter/>
</main>}
