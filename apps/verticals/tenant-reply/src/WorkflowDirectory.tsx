import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createWorkflowDirectory } from '../../../../packages/design-system/src/index'

const WorkflowDirectory=createWorkflowDirectory(createElement)
const situations=[
  {id:'landlord-notice-response',title:'Landlord Notice Response',category:'Notices',description:'Start from the actual notice, property and tenancy details, stated reason, dates, lease references, and the response you want to prepare.',keywords:['landlord notice','tenant notice','lease']},
  {id:'repair-correspondence',title:'Repair Correspondence',category:'Repairs & Conditions',description:'Document the condition, prior requests, photos, dates, communications, access history, and the repair request you intend to send.',keywords:['repair request','maintenance','condition']},
  {id:'habitability-documentation',title:'Habitability Documentation',category:'Repairs & Conditions',description:'Organize condition evidence and correspondence into a reviewable record without turning generated text into a legal conclusion.',keywords:['habitability','conditions','photos','repairs']},
  {id:'security-deposit-dispute',title:'Security Deposit Dispute',category:'Deposits',description:'Keep the move-out record, deductions, photos, receipts, itemization, dates, and correspondence together.',keywords:['security deposit','deductions','move out']},
  {id:'rent-lease-correspondence',title:'Rent or Lease Correspondence',category:'Rent & Lease',description:'Document the notice, lease terms, amounts, dates, prior communications, and the factual response or question you intend to send.',keywords:['rent','lease','payment','notice']},
  {id:'entry-access-correspondence',title:'Entry and Access Correspondence',category:'Entry & Access',description:'Record the notice, requested date and purpose, prior access communications, and the response you intend to make.',keywords:['entry','access','landlord access']},
]

export function TenantWorkflowDirectory(){const items=situations.map(item=>({...item,href:`/?workspace=1&tenant=${item.id}`,badge:'Guided workspace'}));const categories=[...new Set(items.map(item=>item.category))];return <div className='mmp-app'><SiteHeader/><WorkflowDirectory productName='Tenant Reply' title='Find the housing correspondence workflow for the matter in front of you.' description='A landlord notice, repair issue, condition record, deposit dispute, rent or lease question, and access issue are different correspondence jobs. Choose the situation first and keep the source document visible.' items={items} categories={categories.map(category=>({id:category,label:category}))} searchPlaceholder='Search landlord notice, repair, habitability, deposit, rent, lease, access…' helperTitle='Have housing correspondence but not sure where it belongs?' helperDescription='Start from the document or condition that created the matter. Housing procedures and legal requirements vary by jurisdiction, so Tenant Reply keeps authoritative requirements separate from generated drafting.' helperHref='/' helperLabel='Return to Tenant Reply' steps={[
{title:'Identify the matter',description:'Start from the notice, lease, statement, condition, deposit record, or access request that defines the issue.'},
{title:'Verify the facts',description:'Review parties, property, dates, amounts, lease references, stated reasons, and source instructions.'},
{title:'Organize & prepare',description:'Connect photos, receipts, messages, repair records, payment records, and correspondence to the issue.'},
{title:'Review & send',description:'Approve the exact correspondence and attachments before mailing or another consequential action.'},
]} finalTitle='Keep the housing record clear and reviewable.' finalDescription='Choose the correspondence workflow that matches your matter and open the guided workspace with the source record first.' finalHref='/?workspace=1' finalLabel='Open Tenant Reply'/><SiteFooter/></div>}
