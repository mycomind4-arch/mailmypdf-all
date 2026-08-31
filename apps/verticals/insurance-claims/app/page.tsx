import Link from 'next/link'
import { INSURANCE_WORKFLOWS, type InsuranceWorkflowFamily } from '@/domain/insurance-workflows'

const families: InsuranceWorkflowFamily[] = ['New Claims','Denied Claims','Property Damage','Disputes & Appeals','Health & Disability','Specialized Claims']

const familyDescriptions: Record<InsuranceWorkflowFamily, string> = {
  'New Claims': 'Organize a new insurance claim with damage documentation, estimates, and a source-linked timeline before you submit.',
  'Denied Claims': 'Analyze the denial reason, cited policy provision, and evidence gaps, then build a structured response or appeal.',
  'Property Damage': 'Document property damage from water, fire, hail, theft, mold, or flood with photos, estimates, and a loss inventory.',
  'Disputes & Appeals': 'Challenge the insurer position with a fact-based dispute, supplemental claim, or formal appeal citing policy language.',
  'Health & Disability': 'Respond to medical, disability, prior-auth, or out-of-network denials with clinical evidence and provider letters.',
  'Specialized Claims': 'Handle complex claims — business interruption, total loss, and commercial property — with financial and valuation evidence.',
}

export const metadata = {
  title: 'Insurance Claims | Denied Claim, Coverage Dispute & Appeal Workflows',
  description: 'Find the right workflow for a denied insurance claim, coverage denial, roof claim, health claim, disability claim, workers compensation, auto, life, or commercial property dispute. Upload documents, organize evidence, draft a response, review, and mail with proof.',
}

export default function Home() {
  const totalWorkflows = INSURANCE_WORKFLOWS.length
  const totalSearchVolume = INSURANCE_WORKFLOWS.reduce((sum, w) => sum + w.monthlySearches, 0)

  return (
    <main>
      {/* ── Header ── */}
      <header style={{borderBottom:'1px solid rgba(255,255,255,.08)',position:'sticky',top:0,background:'rgba(6,16,24,.85)',backdropFilter:'blur(12px)',zIndex:100}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 0'}}>
          <Link href="/" style={{fontWeight:800,fontSize:18,letterSpacing:'-.02em'}}>Insurance Claims</Link>
          <nav style={{display:'flex',gap:28,fontSize:14,color:'#94a3b8'}}>
            <Link href="/workflows">Workflows</Link>
            <a href="#how">How it works</a>
            <a href="#families">Categories</a>
            <a href="#status">Status</a>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-gradient" style={{borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container" style={{paddingTop:88,paddingBottom:88}}>
          <div className="eyebrow">INSURANCE CLAIMS · {totalWorkflows} WORKFLOWS</div>
          <h1 style={{fontSize:'clamp(42px,7vw,80px)',lineHeight:1.02,fontWeight:800,letterSpacing:'-.03em',margin:'20px 0',maxWidth:900}}>
            Find the insurance claim workflow that matches your problem.
          </h1>
          <p style={{fontSize:'clamp(18px,2.5vw,22px)',lineHeight:1.6,color:'#94a3b8',maxWidth:740,margin:'0 0 36px'}}>
            Insurance search intent is specific: denied claim, coverage denial, roof damage, health denial, disability, workers compensation, auto, and life insurance. This product organizes those jobs into focused, evidence-first workflows.
          </p>
          <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <Link href="/workflows" className="btn btn-primary">Browse all {totalWorkflows} workflows →</Link>
            <a href="#families" className="btn btn-secondary">Browse by category</a>
          </div>
          <div style={{display:'flex',gap:32,marginTop:48,flexWrap:'wrap'}}>
            <div><div style={{fontSize:32,fontWeight:800,color:'#67e8f9'}}>{totalWorkflows}</div><div className="muted" style={{fontSize:13}}>Focused workflows</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#67e8f9'}}>{families.length}</div><div className="muted" style={{fontSize:13}}>Claim categories</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#67e8f9'}}>{(totalSearchVolume/1000).toFixed(0)}K</div><div className="muted" style={{fontSize:13}}>Monthly search volume</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#67e8f9'}}>8</div><div className="muted" style={{fontSize:13}}>Pipeline stages</div></div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="section">
        <div className="container">
          <div className="eyebrow">The 8-stage pipeline</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>A stronger insurance claim workflow</h2>
          <div style={{display:'grid',gap:16,gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))'}}>
            {[
              ['01','Claim','Identify the claim, policy, insurer, loss date, and parties involved.'],
              ['02','Coverage','Review the policy, declarations page, and applicable coverage sections.'],
              ['03','Evidence','Connect photos, estimates, reports, and records to the claimed loss.'],
              ['04','Timeline','Build a chronological timeline of the loss, damage, and insurer interactions.'],
              ['05','Gaps','Surface missing documents, unsupported claims, and unresolved questions.'],
              ['06','Response','Draft a response, appeal, or supplement based on documented facts.'],
              ['07','Review','Human review of the draft before any mailing or submission.'],
              ['08','Mail & Proof','Deliver the reviewed packet and preserve the filing and delivery record.'],
            ].map(([n,t,d]) => (
              <div className="card" style={{padding:24}} key={n}>
                <div style={{fontSize:12,fontWeight:800,color:'#67e8f9'}}>{n}</div>
                <h3 style={{margin:'10px 0 8px',fontSize:18,fontWeight:700}}>{t}</h3>
                <p style={{margin:0,fontSize:14,lineHeight:1.6,color:'#94a3b8'}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow families ── */}
      <section id="families" className="section" style={{borderTop:'1px solid rgba(255,255,255,.08)',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="eyebrow">Browse by category</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>Six families of insurance workflows</h2>
          <div style={{display:'grid',gap:20,gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))'}}>
            {families.map(family => {
              const workflows = INSURANCE_WORKFLOWS.filter(w => w.family === family)
              return (
                <Link key={family} href={`/workflows?family=${encodeURIComponent(family)}`} className="card" style={{padding:28,display:'block'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span className="badge badge-family">{family}</span>
                    <span style={{fontSize:13,color:'#94a3b8'}}>{workflows.length} workflows</span>
                  </div>
                  <p style={{margin:'14px 0 0',fontSize:14,lineHeight:1.6,color:'#94a3b8'}}>{familyDescriptions[family]}</p>
                  <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:8}}>
                    {workflows.slice(0,4).map(w => (
                      <span key={w.id} style={{fontSize:12,padding:'4px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',color:'#cbd5e1'}}>{w.name}</span>
                    ))}
                    {workflows.length > 4 && <span style={{fontSize:12,padding:'4px 10px',color:'#67e8f9'}}>+{workflows.length - 4} more</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Featured workflows ── */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Highest-value workflows</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>Start with the most-searched claim workflows</h2>
          <div className="grid-workflows">
            {INSURANCE_WORKFLOWS.slice().sort((a,b) => b.monthlySearches - a.monthlySearches).slice(0,9).map(w => (
              <Link key={w.id} href={`/workflows/${w.id}`} className="card" style={{padding:24,display:'block'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <h3 style={{margin:0,fontSize:17,fontWeight:700,lineHeight:1.3}}>{w.name}</h3>
                  <span className={`badge badge-${w.risk.toLowerCase()}`}>{w.risk}</span>
                </div>
                <p style={{margin:'10px 0 0',fontSize:13,lineHeight:1.6,color:'#94a3b8'}}>{w.description}</p>
                <div style={{display:'flex',gap:16,marginTop:16}}>
                  <span style={{fontSize:12,color:'#67e8f9'}}>{w.monthlySearches.toLocaleString()}/mo</span>
                  <span style={{fontSize:12,color:'#94a3b8'}}>${w.cpc.toFixed(2)} CPC</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:32}}>
            <Link href="/workflows" className="btn btn-secondary">See all {totalWorkflows} workflows →</Link>
          </div>
        </div>
      </section>

      {/* ── Status ── */}
      <section id="status" className="section" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="card" style={{padding:36,borderColor:'rgba(251,191,36,.2)',background:'rgba(251,191,36,.03)'}}>
            <div className="eyebrow" style={{color:'#fcd34d'}}>Foundation stage</div>
            <h2 style={{margin:'12px 0',fontSize:24,fontWeight:700}}>The directory is ready; the execution engine is still being built.</h2>
            <p style={{margin:0,maxWidth:720,fontSize:15,lineHeight:1.7,color:'#94a3b8'}}>These pages are the master information architecture for Insurance Claims. We are not presenting unfinished workflows as fully operational. Each workflow will become executable as its product implementation is migrated into this repository.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      </main>
  )
}
