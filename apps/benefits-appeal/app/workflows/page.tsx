import Link from 'next/link'
import { WORKFLOWS, type WorkflowFamily } from '@/domain/benefits-workflows'

const SITE_ORIGIN = 'https://benefits-appeal.pages.dev'

export function generateMetadata() {
  return {
    title: `Benefits Appeal Workflows — All | Benefits Appeal`,
    description: `Browse all Benefits Appeal workflows organized by category. Upload the decision or notice, organize evidence, draft a response, review, and mail with proof.`,
    openGraph: { title: `Benefits Appeal Workflows`, description: 'Problem-specific workflows with document upload, evidence organization, response drafting, review, and mailing proof.', type: 'website', siteName: 'Benefits Appeal', url: SITE_ORIGIN + '/workflows' },
    other: { 'application/ld+json': JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Benefits Appeal Workflows', itemListElement: WORKFLOWS.map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.name, url: SITE_ORIGIN + '/workflows/' + w.id })) }) },
  }
}

export default function WorkflowsHub() {
  const families = [...new Set(WORKFLOWS.map(w => w.family))] as WorkflowFamily[]
  return (
    <main>
      <section className="hero-gradient" style={{borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container" style={{paddingTop:64,paddingBottom:56}}>
          <div className="eyebrow">ALL WORKFLOWS · {WORKFLOWS.length} TOTAL</div>
          <h1 style={{fontSize:'clamp(36px,6vw,64px)',lineHeight:1.05,fontWeight:800,letterSpacing:'-.02em',margin:'16px 0',maxWidth:820}}>Every workflow, organized by what you need to do.</h1>
          <p style={{fontSize:18,lineHeight:1.6,color:'#94a3b8',maxWidth:700,margin:'0 0 24px'}}>Each workflow has its own search intent, document requirements, evidence needs, and response structure.</p>
        </div>
      </section>

      {families.map(family => {
        const workflows = WORKFLOWS.filter(w => w.family === family)
        const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        return (
          <section key={family} id={slug} className="section-tight" style={{borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div className="container">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                <div><span className="badge badge-family">{family}</span><h2 style={{margin:'12px 0 0',fontSize:'clamp(24px,4vw,36px)',fontWeight:800,letterSpacing:'-.02em'}}>{workflows.length} {family} Workflows</h2></div>
                <span style={{fontSize:13,color:'#64748b'}}>{workflows.reduce((s,w) => s + w.monthlySearches, 0).toLocaleString()} total monthly searches</span>
              </div>
              <div className="grid-workflows">
                {workflows.map(w => (
                  <Link key={w.id} href={`/workflows/${w.id}`} className="card" style={{padding:22,display:'block'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <h3 style={{margin:0,fontSize:16,fontWeight:700,lineHeight:1.3}}>{w.name}</h3>
                      <span className={`badge badge-${w.risk.toLowerCase()}`}>{w.risk}</span>
                    </div>
                    <p style={{margin:'10px 0 0',fontSize:13,lineHeight:1.6,color:'#94a3b8'}}>{w.description}</p>
                    <div style={{display:'flex',gap:14,marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.06)'}}>
                      <span style={{fontSize:12,color:'#a78bfa',fontWeight:600}}>{w.primaryKeyword}</span>
                      <span style={{fontSize:12,color:'#64748b'}}>{w.monthlySearches.toLocaleString()}/mo</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      </main>
  )
}