import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createWorkflowDirectory } from '../../../../packages/design-system/src/index'

const WorkflowDirectory=createWorkflowDirectory(createElement)
const situations=[
  {id:'insurance-claim-denial',title:'Insurance Claim Denial',category:'Insurance Claims',description:'Organize the denial, policy references, photos, estimates, correspondence, and other supporting records.',keywords:['insurance denial','claim denial','policy','property']},
  {id:'disability-benefits-denial',title:'Disability Benefits Denial',category:'Benefits Decisions',description:'Build a source-linked record from the decision, medical evidence, work information, and appeal instructions.',keywords:['disability','benefits','medical evidence']},
  {id:'health-coverage-denial',title:'Health Coverage Denial',category:'Health Coverage',description:'Map the denial reason to the records, authorization history, provider documentation, and appeal requirements.',keywords:['health insurance','coverage','authorization','medical']},
  {id:'unemployment-decision',title:'Unemployment Decision',category:'Benefits Decisions',description:'Keep the determination, work-separation facts, wage records, dates, and supporting evidence together.',keywords:['unemployment','determination','wages']},
  {id:'workers-compensation-dispute',title:'Workers’ Compensation Dispute',category:'Workplace Claims',description:'Organize the decision, medical and employment records, claim correspondence, and disputed issues.',keywords:['workers compensation','work injury','employment']},
  {id:'va-public-benefit-decision',title:'VA or Public-Benefit Decision',category:'Benefits Decisions',description:'Structure the decision, supporting records, evidence gaps, and a reviewable response without inventing eligibility or outcomes.',keywords:['VA','veterans','public benefits','benefits denial']},
]

export function ClaimProofWorkflowDirectory(){
  const items=situations.map(item=>({...item,href:`/?workspace=1&claim=${item.id}`,badge:'Guided workspace'}))
  const categories=[...new Set(items.map(item=>item.category))]
  return <div className='mmp-app'><SiteHeader/><WorkflowDirectory productName='Claim Proof' title='Choose the claim situation you need to document.' description='Claim Proof starts from the actual denial, determination, or claim correspondence and organizes the evidence around that record. These are the supported claim situations in the current public product.' items={items} categories={categories.map(category=>({id:category,label:category}))} searchPlaceholder='Search insurance denial, disability, health coverage, unemployment, workers’ compensation, VA…' helperTitle='Have a decision but not sure which situation fits?' helperDescription='Start from the organization that issued the decision and the type of benefit, coverage, or claim involved. Claim Proof keeps facts, extracted information, and generated suggestions distinguishable.' helperHref='/' helperLabel='Return to Claim Proof' steps={[
    {title:'Start with the decision',description:'Use the actual denial, determination, or claim correspondence as the source document.'},
    {title:'Build the evidence record',description:'Organize dates, claim identifiers, records, estimates, reports, photos, and correspondence.'},
    {title:'Prepare & review',description:'Create reviewable correspondence or a proof package without inventing facts or outcomes.'},
    {title:'Send & preserve proof',description:'Where supported, use MailMyPDF delivery and retain tracking and proof with the matter.'},
  ]} finalTitle='Build the record before the argument.' finalDescription='Choose the claim situation that matches the decision in front of you and open the guided workspace with the source record first.' finalHref='/?workspace=1' finalLabel='Open Claim Proof'/><SiteFooter/></div>
}
