import Link from 'next/link'
import { ECOSYSTEM_PRODUCTS, ECOSYSTEM_PAGE_URL } from '@/app/lib/ecosystem'

const THIS_PRODUCT = 'Insurance Claims'

export function EcosystemFooter() {
  const otherProducts = ECOSYSTEM_PRODUCTS.filter(p => p.product !== THIS_PRODUCT)
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(6,16,24,0.6)',
      padding: '48px 0 32px',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 32,
        }}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12}}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 7,
                background: '#67e8f9', color: '#0a0f1a',
                fontSize: 13, fontWeight: 800,
              }}>I</span>
              <strong style={{fontSize: 15, color: '#f8fafc'}}>Insurance Claims</strong>
              <span style={{fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase'}}>MailMyPDF</span>
            </div>
            <p style={{fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0}}>
              Part of the MailMyPDF ecosystem — focused workflows for real correspondence problems.
            </p>
          </div>
          <div>
            <h4 style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px'}}>Workflows</h4>
            <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8}}>
              <li><Link href="/" style={{fontSize: 13, color: '#94a3b8'}}>Home</Link></li>
              <li><Link href="/workflows" style={{fontSize: 13, color: '#94a3b8'}}>All Workflows</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', margin: '0 0 12px'}}>MailMyPDF Ecosystem</h4>
            <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6}}>
              {otherProducts.map(p => (
                <li key={p.product}>
                  <a href={p.href} style={{fontSize: 13, color: '#94a3b8'}}>{p.product}</a>
                </li>
              ))}
              <li><a href={ECOSYSTEM_PAGE_URL} style={{fontSize: 13, color: '#67e8f9', fontWeight: 600}}>Explore all products →</a></li>
            </ul>
          </div>
        </div>
        <div style={{
          marginTop: 32, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, color: '#475569',
        }}>
          <span>© 2026 MailMyPDF.</span>
          <span>Insurance Claims is not a law firm and does not provide legal advice.</span>
        </div>
      </div>
    </footer>
  )
}
