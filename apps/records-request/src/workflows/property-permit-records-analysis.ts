export type PropertyPermitRecord = { id:string; filename:string; category?:string; text?:string; sha256?:string }
export type PropertyPermitRequestedCategory = { id:string; label:string; keywords:readonly string[] }
export type PropertyPermitIdentifiers = { address?:string; parcelNumber?:string; permitNumber?:string; owner?:string }
export type PropertyPermitFindingType = 'MISSING_REQUESTED_CATEGORY'|'REFERENCED_RECORD_NOT_PRODUCED'|'PROPERTY_IDENTIFIER_MISMATCH'|'PERMIT_IDENTIFIER_MISMATCH'|'DATE_GAP'|'DUPLICATE_RECORD'|'MISSING_ATTACHMENT'|'UNEXPLAINED_WITHHOLDING'|'REDACTION_REVIEW'|'PARTIAL_PRODUCTION'|'UNRESPONSIVE_ITEM'
export type PropertyPermitFinding={id:string;type:PropertyPermitFindingType;severity:'info'|'warning'|'critical';description:string;recordIds:string[];requestedCategoryId?:string}
export type PropertyPermitAnalysis={recordsReviewed:number;findings:PropertyPermitFinding[];coveredCategoryIds:string[];missingCategoryIds:string[]}
const REDACTION=/(?:redacted|withheld|exempt|privileged|confidential|blackout)/i
const REFERENCE=/(?:see attached|attached|enclosed|plan set|inspection report|permit record|correction notice|certificate of occupancy|drawing|exhibit)/i
function textFor(r:PropertyPermitRecord){return `${r.filename} ${r.category??''} ${r.text??''}`}
function hasExpectedOrCategory(r:PropertyPermitRecord,c:PropertyPermitRequestedCategory){const h=textFor(r).toLowerCase();return Boolean(r.category&&r.category.toLowerCase()===c.id.toLowerCase())||c.keywords.some(k=>h.includes(k.toLowerCase()))}
export function analyzePropertyPermitProduction(requested:readonly PropertyPermitRequestedCategory[],records:readonly PropertyPermitRecord[],ids:PropertyPermitIdentifiers={}):PropertyPermitAnalysis{
 const findings:PropertyPermitFinding[]=[]; const covered:string[]=[]
 for(const c of requested){const m=records.filter(r=>hasExpectedOrCategory(r,c));if(m.length) covered.push(c.id);else findings.push({id:`missing-${c.id}`,type:'MISSING_REQUESTED_CATEGORY',severity:'warning',description:`No produced record was matched to requested property/permit category: ${c.label}.`,recordIds:[],requestedCategoryId:c.id})}
 const hashes=new Map<string,string>()
 for(const r of records){const t=textFor(r);if(r.sha256){const p=hashes.get(r.sha256);if(p)findings.push({id:`duplicate-${r.id}`,type:'DUPLICATE_RECORD',severity:'info',description:`Record appears to duplicate produced record ${p} by SHA-256.`,recordIds:[p,r.id]});else hashes.set(r.sha256,r.id)}
  const lower=t.toLowerCase()
  if(ids.permitNumber && !lower.includes(ids.permitNumber.toLowerCase()) && /permit|application|certificate/i.test(lower)) findings.push({id:`permit-mismatch-${r.id}`,type:'PERMIT_IDENTIFIER_MISMATCH',severity:'warning',description:`Record ${r.filename} may reference a different permit/application identifier; review before treating it as responsive.`,recordIds:[r.id]})
  if(ids.address && /address|property|site|parcel/i.test(lower) && !lower.includes(ids.address.toLowerCase())) findings.push({id:`property-mismatch-${r.id}`,type:'PROPERTY_IDENTIFIER_MISMATCH',severity:'warning',description:`Record ${r.filename} may concern a different property; review its identifiers before treating it as responsive.`,recordIds:[r.id]})
  if(REDACTION.test(t)) findings.push({id:`redaction-${r.id}`,type:'REDACTION_REVIEW',severity:'warning',description:`Record ${r.filename} contains withholding or redaction language and should be reviewed for the stated basis.`,recordIds:[r.id]})
  if(REFERENCE.test(t) && !r.category) findings.push({id:`reference-${r.id}`,type:'REFERENCED_RECORD_NOT_PRODUCED',severity:'warning',description:`Record ${r.filename} appears to reference another property or permit record; confirm whether the referenced item was separately produced.`,recordIds:[r.id]})
 }
 const missing=requested.filter(c=>!covered.includes(c.id)).map(c=>c.id); if(covered.length&&missing.length) findings.push({id:'partial-production',type:'PARTIAL_PRODUCTION',severity:'warning',description:`The production matched ${covered.length} of ${requested.length} requested categories. Review missing categories before treating the response as complete.`,recordIds:[]})
 return {recordsReviewed:records.length,findings,coveredCategoryIds:covered,missingCategoryIds:missing}
}
