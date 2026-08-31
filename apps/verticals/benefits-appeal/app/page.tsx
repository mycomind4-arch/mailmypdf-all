import Link from 'next/link'
import { WORKFLOWS, type WorkflowFamily } from '@/domain/benefits-workflows'

export const metadata = {
  title: 'Benefits Appeal | Decision, Denial & Appeal Workflows',
  description: 'Benefits Appeal — focused workflows for responding to government decisions, denials, and notices. Upload documents, organize evidence, draft a response, review, and mail with proof.',
}

export default function Home() {
  const totalWorkflows = WORKFLOWS.length
  const families = [...new Set(WORKFLOWS.map(w => w.family))] as WorkflowFamily[]
  const totalSearchVolume = WORKFLOWS.reduce((sum, w) => sum + w.monthlySearches, 0)

  return (
    <main>
      <header style={{borderBottom:'1px solid rgba(255,255,255,.08)',position:'sticky',top:0,background:'rgba(6,16,24,.85)',backdropFilter:'blur(12px)',zIndex:100}}>
        <div className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 0'}}>
          <Link href="/" style={{fontWeight:800,fontSize:18,letterSpacing:'-.02em'}}>Benefits Appeal</Link>
          <nav style={{display:'flex',gap:28,fontSize:14,color:'#94a3b8'}}>
            <Link href="/workflows">Workflows</Link>
            <a href="#how">How it works</a>
            <a href="#families">Categories</a>
            <a href="#status">Status</a>
          </nav>
        </div>
      </header>

      <section className="hero-gradient" style={{borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container" style={{paddingTop:88,paddingBottom:88}}>
          <div className="eyebrow">BENEFITS APPEAL · {totalWorkflows} WORKFLOWS</div>
          <h1 style={{fontSize:'clamp(42px,7vw,80px)',lineHeight:1.02,fontWeight:800,letterSpacing:'-.03em',margin:'20px 0',maxWidth:900}}>
            Find the benefits appeal workflow that matches your situation.
          </h1>
          <p style={{fontSize:'clamp(18px,2.5vw,22px)',lineHeight:1.6,color:'#94a3b8',maxWidth:740,margin:'0 0 36px'}}>
            Organize the decision, identify deadlines, connect evidence, build a factual response, review, and deliver with proof of mailing.
          </p>
          <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <Link href="/workflows" className="btn btn-primary">Browse all {totalWorkflows} workflows →</Link>
            <a href="#families" className="btn btn-secondary">Browse by category</a>
          </div>
          <div style={{display:'flex',gap:32,marginTop:48,flexWrap:'wrap'}}>
            <div><div style={{fontSize:32,fontWeight:800,color:'#a78bfa'}}>{totalWorkflows}</div><div className="muted" style={{fontSize:13}}>Focused workflows</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#a78bfa'}}>{families.length}</div><div className="muted" style={{fontSize:13}}>Categories</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#a78bfa'}}>{(totalSearchVolume/1000).toFixed(0)}K</div><div className="muted" style={{fontSize:13}}>Monthly search volume</div></div>
            <div><div style={{fontSize:32,fontWeight:800,color:'#a78bfa'}}>8</div><div className="muted" style={{fontSize:13}}>Pipeline stages</div></div>
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="eyebrow">The 8-stage pipeline</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>A structured response workflow</h2>
          <div style={{display:'grid',gap:16,gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))'}}>
            {[
              ['01','Analyze','Identify the decision, stated reasons, dates, and review pathway.'],
              ['02','Organize','Connect documents and facts to each proposed response ground.'],
              ['03','Timeline','Build a chronological timeline of events, decisions, and deadlines.'],
              ['04','Evidence','Map supporting evidence and identify gaps in the record.'],
              ['05','Gaps','Surface missing documents, unsupported claims, and unresolved questions.'],
              ['06','Draft','Draft a factual response, appeal, or request based on documented facts.'],
              ['07','Review','Human review of the draft before any mailing or submission.'],
              ['08','Mail & Proof','Deliver the reviewed packet and preserve the filing and delivery record.'],
            ].map(([n,t,d]) => (
              <div className="card" style={{padding:24}} key={n}>
                <div style={{fontSize:12,fontWeight:800,color:'#a78bfa'}}>{n}</div>
                <h3 style={{margin:'10px 0 8px',fontSize:18,fontWeight:700}}>{t}</h3>
                <p style={{margin:0,fontSize:14,lineHeight:1.6,color:'#94a3b8'}}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="families" className="section" style={{borderTop:'1px solid rgba(255,255,255,.08)',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="eyebrow">Browse by category</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>{families.length} workflow categories</h2>
          <div style={{display:'grid',gap:20,gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))'}}>
            {families.map(family => {
              const workflows = WORKFLOWS.filter(w => w.family === family)
              return (
                <Link key={family} href={`/workflows?family=${encodeURIComponent(family)}`} className="card" style={{padding:28,display:'block'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span className="badge badge-family">{family}</span>
                    <span style={{fontSize:13,color:'#94a3b8'}}>{workflows.length} workflows</span>
                  </div>
                  <div style={{marginTop:16,display:'flex',flexWrap:'wrap',gap:8}}>
                    {workflows.slice(0,4).map(w => (
                      <span key={w.id} style={{fontSize:12,padding:'4px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',color:'#cbd5e1'}}>{w.name}</span>
                    ))}
                    {workflows.length > 4 && <span style={{fontSize:12,padding:'4px 10px',color:'#a78bfa'}}>+{workflows.length - 4} more</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">Highest-value workflows</div>
          <h2 style={{fontSize:'clamp(28px,4vw,42px)',fontWeight:800,letterSpacing:'-.02em',margin:'12px 0 40px'}}>Start with the most-searched workflows</h2>
          <div className="grid-workflows">
            {WORKFLOWS.slice().sort((a,b) => b.monthlySearches - a.monthlySearches).slice(0,9).map(w => (
              <Link key={w.id} href={`/workflows/${w.id}`} className="card" style={{padding:24,display:'block'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <h3 style={{margin:0,fontSize:17,fontWeight:700,lineHeight:1.3}}>{w.name}</h3>
                  <span className={`badge badge-${w.risk.toLowerCase()}`}>{w.risk}</span>
                </div>
                <p style={{margin:'10px 0 0',fontSize:13,lineHeight:1.6,color:'#94a3b8'}}>{w.description}</p>
                <div style={{display:'flex',gap:16,marginTop:16}}>
                  <span style={{fontSize:12,color:'#a78bfa'}}>{w.monthlySearches.toLocaleString()}/mo</span>
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

      <section id="status" className="section" style={{borderTop:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container">
          <div className="card" style={{padding:36,borderColor:'rgba(251,191,36,.2)',background:'rgba(251,191,36,.03)'}}>
            <div className="eyebrow" style={{color:'#fcd34d'}}>Foundation stage</div>
            <h2 style={{margin:'12px 0',fontSize:24,fontWeight:700}}>The directory is ready; the execution engine is still being built.</h2>
            <p style={{margin:0,maxWidth:720,fontSize:15,lineHeight:1.7,color:'#94a3b8'}}>These pages are the master information architecture for Benefits Appeal. We are not presenting unfinished workflows as fully operational. Each workflow will become executable as its product implementation is migrated into this repository.</p>
          </div>
        </div>
      </section>

      </main>
  )
}