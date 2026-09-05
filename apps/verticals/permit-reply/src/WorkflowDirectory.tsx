import { createElement } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { createWorkflowDirectory } from '../../../../packages/design-system/src/index'

const WorkflowDirectory=createWorkflowDirectory(createElement)
const situations=[
  {id:'permit-denial',title:'Permit Denial',category:'Permits',description:'Organize the denial, application details, stated reasons, plan set, supporting records, and requested reconsideration or next action.',keywords:['permit denial','application','reconsideration']},
  {id:'plan-review-comments',title:'Plan Review Comments',category:'Plan Review',description:'Track each reviewer comment, cited source, response, revised document, and item that still needs verification.',keywords:['plan review','corrections','reviewer comments']},
  {id:'failed-inspection',title:'Failed Inspection',category:'Inspections',description:'Document the inspection result, items requiring correction, photos or records, completed work, and reinspection request.',keywords:['failed inspection','reinspection','corrections']},
  {id:'stop-work-violation-notice',title:'Stop-Work or Violation Notice',category:'Enforcement',description:'Start from the notice, stated conditions and dates, property and permit context, evidence, and the response you intend to send.',keywords:['stop work','violation','notice']},
  {id:'variance-zoning-decision',title:'Variance or Zoning Decision',category:'Planning & Zoning',description:'Keep the application, decision, conditions, supporting facts, exhibits, and review or reconsideration correspondence together.',keywords:['variance','zoning','planning decision']},
  {id:'certificate-closeout',title:'Certificate / Closeout Issue',category:'Closeout',description:'Organize outstanding items, approvals, inspections, corrections, and correspondence needed to document project closeout.',keywords:['certificate','closeout','occupancy','final approval']},
]

export function PermitWorkflowDirectory(){const items=situations.map(item=>({...item,href:`/?workspace=1&permit=${item.id}`,badge:'Guided workspace'}));const categories=[...new Set(items.map(item=>item.category))];return <div className='mmp-app'><SiteHeader/><WorkflowDirectory productName='Permit Reply' title='Find the workflow for the permit or planning document in front of you.' description='Permit denials, plan-review corrections, failed inspections, stop-work notices, zoning decisions, and project closeout are different jobs. Choose the situation first, then continue from the actual local record.' items={items} categories={categories.map(category=>({id:category,label:category}))} searchPlaceholder='Search permit denial, plan review, inspection, stop work, zoning, closeout…' helperTitle='Have permit correspondence but not sure what type it is?' helperDescription='Use the issuing department, notice title, permit or application number, reviewer comments, and requested action to choose the closest situation. Local adoption and procedures remain authoritative.' helperHref='/' helperLabel='Return to Permit Reply' steps={[
{title:'Identify the document',description:'Start from the agency notice, denial, correction list, inspection result, or planning decision.'},
{title:'Verify project facts',description:'Review property, permit, application, authority, dates, comments, and requested action.'},
{title:'Organize & prepare',description:'Connect plans, photos, approvals, reports, and corrections to the issue they address.'},
{title:'Review & send',description:'Verify the exact reply and attachments before mailing or another consequential action.'},
]} finalTitle='Respond from the project record, not from a generic template.' finalDescription='Choose the permit situation that matches the document in front of you and open the guided workspace with the source record preserved.' finalHref='/?workspace=1' finalLabel='Open Permit Reply'/><SiteFooter/></div>}
