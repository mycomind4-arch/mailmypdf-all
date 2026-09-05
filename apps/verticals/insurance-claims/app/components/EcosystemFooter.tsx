'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ECOSYSTEM_PRODUCTS, ECOSYSTEM_PAGE_URL } from '@/app/lib/ecosystem'

const THIS_PRODUCT = 'Insurance Claims'

export function EcosystemFooter() {
  const pathname = usePathname()
  const otherProducts = ECOSYSTEM_PRODUCTS.filter(p => p.product !== THIS_PRODUCT)
  if (pathname.startsWith('/dashboard')) return null

  return (
    <footer style={{
      borderTop: '1px solid var(--mmp-border)',
      background: 'var(--mmp-paper-deep)',
      padding: '48px 0 32px',
    }}>
      <div className="mmp-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
          <div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12}}>
              <strong style={{fontFamily:'var(--mmp-font-display)',fontSize:22,fontWeight:400,color:'var(--mmp-ink)'}}>Insurance Claims</strong>
              <span style={{fontSize:10,fontWeight:700,color:'var(--mmp-accent)',letterSpacing:'.12em',textTransform:'uppercase'}}>MailMyPDF</span>
            </div>
            <p style={{fontSize:13,color:'var(--mmp-ink-muted)',lineHeight:1.6,margin:0}}>Evidence-first insurance claim workflows with review, mailing, and proof boundaries.</p>
          </div>
          <div>
            <h4 style={{fontSize:11,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mmp-ink-muted)',margin:'0 0 12px'}}>Workflows</h4>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:8}}>
              <li><Link href="/" style={{fontSize:13,color:'var(--mmp-ink-muted)'}}>Home</Link></li>
              <li><Link href="/workflows" style={{fontSize:13,color:'var(--mmp-ink-muted)'}}>All Workflows</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{fontSize:11,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'var(--mmp-ink-muted)',margin:'0 0 12px'}}>MailMyPDF Ecosystem</h4>
            <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:6}}>
              {otherProducts.map(p => <li key={p.product}><a href={p.href} style={{fontSize:13,color:'var(--mmp-ink-muted)'}}>{p.product}</a></li>)}
              <li><a href={ECOSYSTEM_PAGE_URL} style={{fontSize:13,color:'var(--mmp-accent)',fontWeight:600}}>Explore all products →</a></li>
            </ul>
          </div>
        </div>
        <div style={{marginTop:32,paddingTop:20,borderTop:'1px solid var(--mmp-border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,color:'var(--mmp-ink-muted)',gap:20,flexWrap:'wrap'}}>
          <span>© 2026 MailMyPDF.</span>
          <span>Insurance Claims is not a law firm and does not provide legal advice.</span>
        </div>
      </div>
    </footer>
  )
}