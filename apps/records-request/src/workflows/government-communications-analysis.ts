export type GovernmentCommunicationRecord={id:string;filename:string;category?:string;text?:string;sha256?:string;threadId?:string}
export type GovernmentCommunicationRequestedCategory={id:string;label:string;keywords:readonly string[]}
export type GovernmentCommunicationFindingType=typeof GOVERNMENT_COMMUNICATION_FINDING_TYPES[number]
export const GOVERNMENT_COMMUNICATION_FINDING_TYPES=['MISSING_REQUESTED_CATEGORY','CUSTODIAN_GAP','SEARCH_SCOPE_AMBIGUITY','REFERENCED_ATTACHMENT_NOT_PRODUCED','DATE_GAP','DUPLICATE_RECORD','THREAD_GAP','MISSING_ATTACHMENT','UNEXPLAINED_WITHHOLDING','REDACTION_REVIEW','PARTIAL_PRODUCTION','UNRESPONSIVE_ITEM'] as const
export type GovernmentCommunicationFinding={id:string;type:GovernmentCommunicationFindingType;severity:'info'|'warning'|'critical';description:string;recordIds:string[];requestedCategoryId?:string}
export type GovernmentCommunicationAnalysis={recordsReviewed:number;findings:GovernmentCommunicationFinding[];coveredCategoryIds:string[];missingCategoryIds:string[]}
const REDACTION=/\b(redacted|withheld|exempt|privileged|confidential|blackout)\b/i
const ATTACHMENT_REF=/\b(see attached|attached|attachment|enclosed|attached file|attachment follows)\b/i
function content(r:GovernmentCommunicationRecord){return `${r.filename} ${r.category??''} ${r.text??''}`.trim()}
function matches(r:GovernmentCommunicationRecord,c:GovernmentCommunicationRequestedCategory){const h=content(r).toLowerCase();return Boolean(r.category&&r.category.toLowerCase()===c.id.toLowerCase())||c.keywords.some(k=>h.includes(k.toLowerCase()))}
export function analyzeGovernmentCommunicationProduction(requested:readonly GovernmentCommunicationRequestedCategory[],records:readonly GovernmentCommunicationRecord[]):GovernmentCommunicationAnalysis{
 const findings:GovernmentCommunicationFinding[]=[];const covered:string[]=[];const threadCounts=new Map<string,number>();const hashes=new Map<string,string>()
 for(const c of requested){const m=records.filter(r=>matches(r,c));if(m.length)covered.push(c.id);else findings.push({id:`missing-${c.id}`,type:'MISSING_REQUESTED_CATEGORY',severity:'warning',description:`No produced record was matched to requested communication category: ${c.label}.`,recordIds:[],requestedCategoryId:c.id})}
 for(const r of records){const t=content(r);if(r.threadId)threadCounts.set(r.threadId,(threadCounts.get(r.threadId)??0)+1)
   if(r.sha256){const prior=hashes.get(r.sha256);if(prior)findings.push({id:`duplicate-${r.id}`,type:'DUPLICATE_RECORD',severity:'info',description:`Record appears to duplicate produced record ${prior} by SHA-256.`,recordIds:[prior,r.id]});else hashes.set(r.sha256,r.id)}
   if(REDACTION.test(t))findings.push({id:`redaction-${r.id}`,type:'REDACTION_REVIEW',severity:'warning',description:`Record ${r.filename} contains withholding or redaction language and should be reviewed for the stated basis.`,recordIds:[r.id]})
   if(ATTACHMENT_REF.test(t)&&!r.filename.match(/\.(pdf|docx?|xlsx?|csv|jpg|jpeg|png|zip|eml|msg)$/i))findings.push({id:`attachment-ref-${r.id}`,type:'REFERENCED_ATTACHMENT_NOT_PRODUCED',severity:'warning',description:`Record ${r.filename} appears to reference an attachment or enclosed file; confirm whether that file was separately produced.`,recordIds:[r.id]})
 }
 const missing=requested.filter(c=>!covered.includes(c.id)).map(c=>c.id)
 if(covered.length&&missing.length)findings.push({id:'partial-production',type:'PARTIAL_PRODUCTION',severity:'warning',description:`The production matched ${covered.length} of ${requested.length} requested communication categories. Review missing categories before treating the response as complete.`,recordIds:[]})
 return {recordsReviewed:records.length,findings,coveredCategoryIds:covered,missingCategoryIds:missing}
}
