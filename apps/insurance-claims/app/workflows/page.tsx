import Link from 'next/link'
import { INSURANCE_WORKFLOWS, type InsuranceWorkflowFamily } from '@/domain/insurance-workflows'

const families: InsuranceWorkflowFamily[] = ['New Claims','Denied Claims','Property Damage','Disputes & Appeals','Health & Disability','Specialized Claims']

const SITE_ORIGIN = 'https://insurance-claims.pages.dev'

export function generateMetadata() {
  return {
    title: 'Insurance Claim Workflows — All 30 | Insurance Claims',
    description: 'Browse all insurance claim workflows: denied claims, coverage denials, property damage, health and disability, disputes and appeals, and specialized claims.',
    openGraph: {
      title: 'Insurance Claim Workflows | Insurance Claims',
      description: 'Problem-specific insurance claim workflows with document upload, evidence organization, response drafting, review, and MailMyPDF fulfillment.',
      type: 'website',
      siteName: 'Insurance Claims',
      url: SITE_ORIGIN + '/workflows',
    },
    other: {
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Insurance Claims Workflows',
        itemListElement: INSURANCE_WORKFLOWS.map((w, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: w.name,
          url: SITE_ORIGIN + '/workflows/' + w.id,
        })),
      }),
    },
  }
}

export default function WorkflowsHub() {
  return (
    <main>
      {/* ── Header ── */}
      {/* ── Hero ── */}
      <section className="hero-gradient" style={{borderBottom:'1px solid rgba(255,255,255,.08)'}}>
        <div className="container" style={{paddingTop:64,paddingBottom:56}}>
          <div className="eyebrow">ALL WORKFLOWS · {INSURANCE_WORKFLOWS.length} TOTAL</div>
          <h1 style={{fontSize:'clamp(36px,6vw,64px)',lineHeight:1.05,fontWeight:800,letterSpacing:'-.02em',margin:'16px 0',maxWidth:820}}>
            Every insurance claim workflow, organized by what you need to do.
          </h1>
          <p style={{fontSize:18,lineHeight:1.6,color:'#94a3b8',maxWidth:700,margin:'0 0 24px'}}>
            From filing a new claim to appealing a denial to disputing an underpayment — each workflow has its own search intent, document requirements, evidence needs, and response structure.
          </p>
        </div>
      </section>

      {/* ── Family sections ── */}
      {families.map(family => {
        const workflows = INSURANCE_WORKFLOWS.filter(w => w.family === family)
        const slug = family.toLowerCase().replace(/&/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
        return (
          <section key={family} id={slug} className="section-tight" style={{borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div className="container">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                <div>
                  <span className="badge badge-family">{family}</span>
                  <h2 style={{margin:'12px 0 0',fontSize:'clamp(24px,4vw,36px)',fontWeight:800,letterSpacing:'-.02em'}}>{workflows.length} {family} Workflows</h2>
                </div>
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
                      <span style={{fontSize:12,color:'#67e8f9',fontWeight:600}}>{w.primaryKeyword}</span>
                      <span style={{fontSize:12,color:'#64748b'}}>{w.monthlySearches.toLocaleString()}/mo</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      {/* ── Footer ── */}
      </main>
  )
}
