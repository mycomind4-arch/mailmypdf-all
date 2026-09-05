import { createFileRoute } from '@tanstack/react-router'
import { createElement } from 'react'
import { INSURANCE_WORKFLOWS } from '@/domain/insurance-workflows'
import { createWorkflowDirectory } from '../../../../../../packages/design-system/src/index'
import { PublicFooter, PublicHeader } from '../../components/public-chrome'

const WorkflowDirectory=createWorkflowDirectory(createElement)
export const Route=createFileRoute('/workflows/')({component:Hub,head:()=>({meta:[{title:'Insurance Claim Workflows | MailMyPDF'},{name:'description',content:'Browse insurance workflows for new claims, denied claims, property damage, disputes and appeals, health and disability matters, and specialized claims.'},{name:'robots',content:'index,follow'}]})})
function Hub(){const families=[...new Set(INSURANCE_WORKFLOWS.map(w=>w.family))];const items=INSURANCE_WORKFLOWS.map(w=>({id:w.id,title:w.name,category:w.family,description:w.description,href:`/workflows/${w.id}`,badge:w.risk,meta:w.requiresReview?'Review required':undefined,keywords:[w.primaryKeyword,...w.supportingKeywords]}));return <main><PublicHeader/><WorkflowDirectory productName='Insurance Claims' title='Find the workflow for your claim, denial, or coverage problem.' description='Browse the real Insurance Claims catalog by claim family or search for the loss, denial, policy issue, or appeal in front of you. Workflow pages remain specific to the insurance problem rather than collapsing everything into one generic claim form.' items={items} categories={families.map(family=>({id:family,label:family}))} searchPlaceholder='Search home, auto, denial, property damage, medical, disability, coverage…' helperTitle='Not sure which insurance workflow fits?' helperDescription='Start with whether you are filing a new claim, responding to a denial, documenting a property loss, or challenging a coverage decision. Then narrow by the claim family.' helperHref='/workflows' helperLabel='Browse All Claims' steps={[
{title:'Choose the claim path',description:'Match the new claim, denial, loss, or appeal to a problem-specific workflow.'},
{title:'Build the record',description:'Add policy materials, claim documents, loss evidence, estimates, and insurer correspondence.'},
{title:'Prepare & review',description:'Keep policy text, insurer statements, extracted facts, and generated suggestions distinct.'},
{title:'Send & keep proof',description:'Download the response or choose MailMyPDF mailing, tracking, and proof options.'},
]} finalTitle='Make the insurance record easier to act on.' finalDescription='Choose the workflow that matches the claim or denial you have and move into the private workspace only when you are ready to prepare it.' finalHref='/workflows' finalLabel='Choose a Claim Workflow'/><PublicFooter/></main>}
