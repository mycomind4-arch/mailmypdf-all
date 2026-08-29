import Link from 'next/link'

const workflows = {
  'denied-insurance-claim': ['Denied Insurance Claim','How to respond when an insurance company denies your claim.'],
  'appeal-insurance-denial': ['Appeal an Insurance Denial','Organize the denial reason, policy language, evidence, and requested outcome.'],
  'health-insurance-denial': ['Health Insurance Denial','Prepare a focused response to a medical-necessity, coverage, or claim denial.'],
  'home-roof-claim-denial': ['Home or Roof Claim Denial','Organize property damage evidence, estimates, photos, timelines, and coverage records.'],
  'auto-insurance-claim-denial': ['Auto Insurance Claim Denial','Build a record of the incident, denial, damages, evidence, and requested reconsideration.'],
  'workers-comp-denial': ['Workers Compensation Denial','Organize the denial and supporting employment, medical, and incident records.'],
  'disability-claim-denial': ['Disability Claim Denial','Structure a response to a short- or long-term disability denial.'],
  'life-insurance-claim-denial': ['Life Insurance Claim Denial','Organize the policy, claim record, denial explanation, and supporting documents.'],
} as const

export function generateStaticParams(){return Object.keys(workflows).map(slug=>({slug}))}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const [title,desc]=workflows[slug as keyof typeof workflows] ?? ['Insurance Claim Workflow','Insurance claim response workflow']
  return {title:`${title} | Insurance Claims`,description:desc,robots:{index:false,follow:true}}
}

export default async function WorkflowPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const item=workflows[slug as keyof typeof workflows]
  if(!item) return <main className="container" style={{paddingTop:80}}><h1>Workflow not found</h1><Link href="/">Back to Insurance Claims →</Link></main>
  const [title,desc]=item
  return <main style={{minHeight:'100vh',background:'#061018'}}><header style={{borderBottom:'1px solid rgba(255,255,255,.1)'}}><div className="container" style={{display:'flex',justifyContent:'space-between',paddingTop:20,paddingBottom:20}}><Link href="/" style={{fontWeight:700}}>Insurance Claims</Link><Link href="/" style={{color:'#67e8f9',fontSize:14}}>All workflows →</Link></div></header><section className="container" style={{paddingTop:72,paddingBottom:72,maxWidth:900}}><div className="eyebrow">INSURANCE CLAIM WORKFLOW</div><h1 style={{fontSize:'clamp(42px,7vw,72px)',lineHeight:1.02,margin:'18px 0'}}>{title}</h1><p className="muted" style={{fontSize:20,lineHeight:1.6,maxWidth:720}}>{desc}</p><div className="card" style={{marginTop:40,padding:28}}><h2 style={{marginTop:0}}>What this workflow will organize</h2><div style={{display:'grid',gap:12,color:'#cbd5e1',lineHeight:1.6}}><div>• Claim, policy, denial, and correspondence records</div><div>• Timeline of the incident, claim, decision, and deadlines</div><div>• Supporting evidence and unresolved issues</div><div>• Draft response or appeal structure</div><div>• Final review before physical delivery through MailMyPDF</div></div></div><div className="card" style={{marginTop:18,padding:20,borderColor:'rgba(251,191,36,.25)'}}><strong style={{color:'#fcd34d'}}>Execution status:</strong><span className="muted"> this vertical is still being implemented. The directory and search-intent page are live in the repository, but the interactive claim workflow is not yet presented as production-ready.</span></div></section></main>
}
