import { createFileRoute } from '@tanstack/react-router'
import { createElement } from 'react'
import { createWorkflowDirectory } from '../../../../../packages/design-system/src/index'
import { PublicFooter, PublicHeader } from '../components/public-chrome'

const WORKFLOWS=[
'respond-to-code-violation-notice','respond-to-notice-of-violation','respond-to-property-maintenance-violation','respond-to-building-code-violation','respond-to-zoning-violation','respond-to-unpermitted-construction-notice','request-code-enforcement-extension','request-additional-time-to-correct-violations','submit-proof-of-correction','request-reinspection','dispute-code-enforcement-citation','appeal-code-enforcement-decision','request-administrative-hearing','respond-to-abatement-notice','dispute-code-enforcement-fine','request-case-status','request-inspection-records','compliance-confirmation','request-case-closure','penalty-reduction-request','payment-plan-request','voluntary-compliance-agreement','respond-to-nuisance-violation','respond-to-trash-debris-violation','respond-to-vegetation-violation','respond-to-unsafe-structure-notice','respond-to-vacant-property-notice','respond-to-illegal-occupancy-notice','respond-to-signage-violation','respond-to-fence-setback-violation','respond-to-short-term-rental-notice','request-supervisor-review','request-administrative-review','hearing-continuance-request','submit-supplemental-evidence','challenge-inspection-findings','challenge-abatement-action','appeal-citation'] as const
const label=(s:string)=>s.split('-').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ')
const categoryFor=(id:string)=> id.includes('hearing')||id.includes('appeal')||id.includes('review')?'Hearings & Appeals':id.includes('inspection')||id.includes('reinspection')?'Inspections':id.includes('evidence')||id.includes('proof')||id.includes('correction')||id.includes('compliance')?'Evidence & Compliance':id.includes('closure')||id.includes('status')||id.includes('records')?'Case Status & Records':id.includes('fine')||id.includes('penalty')||id.includes('payment')||id.includes('citation')?'Citations & Penalties':'Notices & Violations'
const categories=['Notices & Violations','Inspections','Evidence & Compliance','Hearings & Appeals','Citations & Penalties','Case Status & Records']
const WorkflowDirectory=createWorkflowDirectory(createElement)

export const Route=createFileRoute('/workflows')({component:Workflows})
function Workflows(){
  const items=WORKFLOWS.map(id=>({id,title:label(id),category:categoryFor(id),description:`Structured Code Enforcement workflow for ${label(id).toLowerCase()}.`,href:`/workflows/${id}`,keywords:id.split('-')}))
  return <main><PublicHeader/><WorkflowDirectory productName='Code Enforcement' title='Find the workflow that matches the agency action.' description='Browse notices, inspections, correction and evidence submissions, hearings, citations, penalties, records, and case-closure workflows. Public discovery stays open; private execution remains account-scoped.' items={items} categories={categories.map(category=>({id:category,label:category}))} searchPlaceholder='Search violation, inspection, evidence, hearing, citation, closure…' helperTitle='Have a notice but not sure what action to take?' helperDescription='Start with the title of the agency document and the action it asks you to take. Use those terms to narrow this directory before starting a private workflow.' helperHref='/workflows' helperLabel='Browse All Actions' steps={[
    {title:'Identify the agency action',description:'Match the notice, inspection, citation, or procedural step to the right workflow.'},
    {title:'Add the record',description:'Bring in the notice, property facts, dates, allegations, and supporting evidence.'},
    {title:'Prepare and review',description:'Build a response tied to the selected action and review every consequential fact.'},
    {title:'Send and prove',description:'Download the response or use MailMyPDF mailing, tracking, and proof options.'},
  ]} finalTitle='Respond to the action actually in front of you.' finalDescription='Choose the exact Code Enforcement workflow and keep the notice, evidence, response, mailing, and proof connected.' finalHref='/workflows' finalLabel='Choose a Workflow'/><PublicFooter/></main>
}
