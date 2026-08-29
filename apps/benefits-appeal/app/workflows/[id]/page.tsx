import Link from 'next/link'
import { notFound } from 'next/navigation'
import { STAGES } from '@/domain/benefits-workflows'
import { workflowMap, WORKFLOWS, type WorkflowId } from '@/domain/benefits-workflows'

const SITE_ORIGIN = 'https://benefits-appeal.pages.dev'
const STAGE_DESCRIPTIONS = ['Identify the decision, stated reasons, dates, and review pathway.','Connect documents and facts to each proposed response ground.','Build a chronological timeline of events and deadlines.','Map supporting evidence and identify gaps.','Surface missing documents and unsupported claims.','Draft a factual response based on documented facts.','Human review of the draft before mailing.','Deliver the packet and preserve the filing record.']

export function generateStaticParams() { return WORKFLOWS.map(w => ({ id: w.id })) }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = workflowMap[id as WorkflowId]
  if (!workflow) return { title: 'Benefits Appeal Workflow' }
  return {
    title: `${workflow.name} | Benefits Appeal`,
    description: workflow.description,
    keywords: [workflow.primaryKeyword, ...workflow.supportingKeywords],
    alternates: { canonical: `/workflows/${workflow.id}` },
    openGraph: { title: `${workflow.name} | Benefits Appeal`, description: workflow.description, type: 'article', siteName: 'Benefits Appeal', url: `${SITE_ORIGIN}/workflows/${workflow.id}` },
    twitter: { card: 'summary', title: `${workflow.name} | Benefits Appeal`, description: workflow.description },
    other: { 'application/ld+json': JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: workflow.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) },
  }
}

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = workflowMap[id as WorkflowId]
  if (!workflow) notFound()
  const related = WORKFLOWS.filter(w => w.family === workflow.family && w.id !== workflow.id).slice(0, 4)
  const riskClass = `badge-${workflow.risk.toLowerCase()}`

  return (
    <main>
      <div className="container" style={{paddingTop:20}}>
        <div style={{fontSize:13,color:'#64748b',display:'flex',gap:8,alignItems:'center'}}>
          <Link href="/" style={{color:'#64748b'}}>Home</Link><span>/</span>
          <Link href="/workflows" style={{color:'#64748b'}}>Workflows</Link><span>/</span>
          <span style={{color:'#94a3b8'}}>{workflow.name}</span>
        </div>
      </div>

      <section style={{paddingTop:32,paddingBottom:40}}>
        <div className="container">
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:16}}>
            <span className="badge badge-family">{workflow.family}</span>
            <span className={`badge ${riskClass}`}>{workflow.risk} RISK</span>
            {workflow.requiresReview && <span style={{fontSize:12,color:'#94a3b8'}}>Human review required</span>}
          </div>
          <h1 style={{fontSize:'clamp(36px,6vw,64px)',lineHeight:1.05,fontWeight:800,letterSpacing:'-.02em',margin:'0 0 20px',maxWidth:900}}>{workflow.name}</h1>
          <p style={{fontSize:'clamp(18px,2.5vw,22px)',lineHeight:1.6,color:'#94a3b8',maxWidth:760,margin:'0 0 32px'}}>{workflow.description}</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,maxWidth:680}}>
            <div className="stat-card"><div className="muted" style={{fontSize:12}}>Monthly searches</div><div style={{fontSize:24,fontWeight:700,marginTop:4}}>{workflow.monthlySearches.toLocaleString()}</div></div>
            <div className="stat-card"><div className="muted" style={{fontSize:12}}>CPC</div><div style={{fontSize:24,fontWeight:700,marginTop:4}}>${workflow.cpc.toFixed(2)}</div></div>
            <div className="stat-card"><div className="muted" style={{fontSize:12}}>Competition</div><div style={{fontSize:24,fontWeight:700,marginTop:4}}>{workflow.competition}</div></div>
            <div className="stat-card"><div className="muted" style={{fontSize:12}}>Primary keyword</div><div style={{fontSize:15,fontWeight:600,marginTop:6,color:'#a78bfa'}}>{workflow.primaryKeyword}</div></div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="eyebrow">Workflow standard</div>
          <h2 style={{fontSize:'clamp(24px,4vw,36px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 28px'}}>The 8-stage pipeline</h2>
          <div style={{display:'grid',gap:10,gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))'}}>
            {STAGES.map((stage, i) => (
              <div className="pipeline-step" key={stage}>
                <span className="pipeline-num">{String(i+1).padStart(2,'0')}</span>
                <div><div style={{fontWeight:600,textTransform:'capitalize'}}>{stage.replaceAll('-',' ')}</div><div style={{fontSize:13,color:'#94a3b8',marginTop:2}}>{STAGE_DESCRIPTIONS[i] || ''}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div style={{display:'grid',gap:20,gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))'}}>
            <div className="card" style={{padding:28}}><div className="eyebrow">What you start with</div><h3 style={{margin:'10px 0 16px',fontSize:20,fontWeight:700}}>Intake items</h3><ul className="evidence-list">{workflow.intake.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div className="card" style={{padding:28}}><div className="eyebrow">What you gather</div><h3 style={{margin:'10px 0 16px',fontSize:20,fontWeight:700}}>Required evidence</h3><ul className="evidence-list">{workflow.requiredEvidence.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div className="card" style={{padding:28}}><div className="eyebrow">What you get</div><h3 style={{margin:'10px 0 16px',fontSize:20,fontWeight:700}}>Outputs</h3><ul className="evidence-list">{workflow.outputs.map(item => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
      </section>

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="eyebrow">Search intent cluster</div>
          <h3 style={{margin:'12px 0 20px',fontSize:22,fontWeight:700}}>This workflow targets</h3>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            <span style={{padding:'8px 16px',borderRadius:10,background:'rgba(a78bfa,.1)',color:'#a78bfa',fontSize:13,fontWeight:600}}>{workflow.primaryKeyword} ({workflow.monthlySearches.toLocaleString()}/mo)</span>
            {workflow.supportingKeywords.map(kw => <span key={kw} style={{padding:'8px 16px',borderRadius:10,background:'rgba(255,255,255,.04)',color:'#cbd5e1',fontSize:13}}>{kw}</span>)}
          </div>
        </div>
      </section>

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="eyebrow">Safety guardrails</div>
          <h3 style={{margin:'12px 0 20px',fontSize:22,fontWeight:700}}>What this workflow will never do</h3>
          <div style={{display:'grid',gap:12}}>
            {workflow.guardrails.map(rule => (
              <div key={rule} className="card" style={{padding:18,display:'flex',gap:12,alignItems:'flex-start'}}>
                <span style={{color:'#f87171',fontSize:18,fontWeight:700}}>&times;</span>
                <p style={{margin:0,fontSize:14,lineHeight:1.6,color:'#94a3b8'}}>{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container" style={{maxWidth:800}}>
          <div className="eyebrow">Frequently asked questions</div>
          <h2 style={{fontSize:'clamp(24px,4vw,36px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 28px'}}>Common questions about {workflow.name.toLowerCase()}</h2>
          {workflow.faqs.map((faq, i) => (
            <div key={i} className="faq-item"><h3>{faq.q}</h3><p>{faq.a}</p></div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
          <div className="container">
            <div className="eyebrow">Related workflows</div>
            <h3 style={{margin:'12px 0 20px',fontSize:22,fontWeight:700}}>More in {workflow.family}</h3>
            <div style={{display:'grid',gap:14,gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))'}}>
              {related.map(w => (
                <Link key={w.id} href={`/workflows/${w.id}`} className="card" style={{padding:18,display:'block'}}>
                  <h4 style={{margin:0,fontSize:15,fontWeight:600}}>{w.name}</h4>
                  <p style={{margin:'8px 0 0',fontSize:13,lineHeight:1.5,color:'#94a3b8'}}>{w.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-tight" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="card" style={{padding:28,borderColor:'rgba(251,191,36,.2)',background:'rgba(251,191,36,.03)'}}>
            <strong style={{color:'#fcd34d'}}>Execution status:</strong>
            <span className="muted"> This vertical is still being implemented. The directory and search-intent page are live, but the interactive workflow is not yet presented as production-ready.</span>
          </div>
        </div>
      </section>

      </main>
  )
}