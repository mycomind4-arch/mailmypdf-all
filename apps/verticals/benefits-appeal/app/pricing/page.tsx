import Link from 'next/link'

export const metadata = {
  title: 'Pricing — Benefits Appeal',
  description: 'Transparent pricing for benefits appeal workflows. Pay per workflow plus mailing costs.',
}

const WORKFLOW_PRICING = [
  { id: 'ssdi-denial', name: 'SSDI Denial Appeal', band: 'ADVANCED', price: '$69.99', mail: 'standard' },
  { id: 'ssdi-appeal', name: 'SSDI Formal Appeal', band: 'ADVANCED', price: '$69.99', mail: 'standard' },
  { id: 'ssi-denial', name: 'SSI Denial Appeal', band: 'ADVANCED', price: '$59.99', mail: 'standard' },
  { id: 'social-security-denial', name: 'Social Security Denial Appeal', band: 'ADVANCED', price: '$59.99', mail: 'standard' },
  { id: 'medicaid-denial', name: 'Medicaid Denial Appeal', band: 'ADVANCED', price: '$59.99', mail: 'standard' },
  { id: 'unemployment-denial', name: 'Unemployment Denial Appeal', band: 'STANDARD', price: '$39.99', mail: 'none' },
  { id: 'edd-denial', name: 'EDD Denial Appeal', band: 'STANDARD', price: '$39.99', mail: 'none' },
  { id: 'financial-aid-appeal', name: 'Financial Aid Appeal', band: 'STANDARD', price: '$29.99', mail: 'none' },
  { id: 'sap-appeal', name: 'SAP Appeal', band: 'STANDARD', price: '$29.99', mail: 'none' },
  { id: 'fafsa-appeal', name: 'FAFSA Appeal', band: 'STANDARD', price: '$29.99', mail: 'none' },
  { id: 'scholarship-appeal', name: 'Scholarship Appeal', band: 'STANDARD', price: '$29.99', mail: 'none' },
]

const MAIL_PRICING = [
  { class: 'Standard', price: '$4.99', desc: 'Standard delivery with tracking' },
  { class: 'Certified', price: '$14.94', desc: 'Certified mail with signature proof' },
  { class: 'Registered', price: '$32.49', desc: 'Registered mail for high-value documents' },
]

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Pricing
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Pay per workflow plus mailing costs. No subscriptions, no hidden fees.
      </p>

      <h2 style={sectionLabel}>Workflow Preparation Fees</h2>
      <div style={{ overflowX: 'auto', marginBottom: '2.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={thStyle}>Workflow</th>
              <th style={thStyle}>Tier</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
              <th style={thStyle}>Mail Included</th>
            </tr>
          </thead>
          <tbody>
            {WORKFLOW_PRICING.map((w) => (
              <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={tdStyle}>{w.name}</td>
                <td style={tdStyle}>
                  <span style={bandBadge(w.band)}>{w.band}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{w.price}</td>
                <td style={tdStyle}>{w.mail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={sectionLabel}>Mailing Options</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {MAIL_PRICING.map((m) => (
          <div key={m.class} style={{
            padding: '1.5rem',
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.625rem',
          }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.5rem' }}>{m.class}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginBottom: '0.25rem' }}>{m.price}</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{m.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: '1.5rem', background: 'rgba(15,23,42,0.6)', borderRadius: '0.625rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.75rem' }}>Additional Costs</h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.8 }}>
          <li>Color printing: $0.50 per page</li>
          <li>Mail class surcharge: applied per the pricing engine</li>
          <li>No subscription fees — pay only when you mail</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link href="/start" style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.875rem 2rem',
          background: '#a78bfa', color: '#0a0f1a', borderRadius: '0.5rem',
          fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
        }}>Start an Appeal</Link>
      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa',
  marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem',
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.625rem 0.75rem',
  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b',
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem', fontSize: '0.9rem', color: '#f8fafc',
}

function bandBadge(band: string): React.CSSProperties {
  const colors: Record<string, string> = {
    STANDARD: '#a78bfa',
    ADVANCED: '#fb7185',
    ESSENTIAL: '#fbbf24',
  }
  return {
    display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '0.25rem',
    fontSize: '0.7rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
    color: colors[band] || '#64748b', background: 'rgba(15,23,42,0.8)',
  }
}
