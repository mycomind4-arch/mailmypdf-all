import Link from 'next/link'

export const metadata = {
  title: 'Pricing — Code Enforcement',
  description: 'Transparent pricing for code enforcement response workflows. Pay per workflow plus mailing costs.',
}

const WORKFLOW_PRICING = [
  { id: 'appeal-code-enforcement-decision', name: 'Appeal Code Enforcement Decision', band: 'ADVANCED', price: '$49.99', mail: 'none' },
  { id: 'request-administrative-hearing', name: 'Request Administrative Hearing', band: 'STANDARD', price: '$29.99', mail: 'none' },
  { id: 'respond-to-abatement-notice', name: 'Respond to Abatement Notice', band: 'STANDARD', price: '$24.99', mail: 'none' },
  { id: 'dispute-code-enforcement-fine', name: 'Dispute Code Enforcement Fine/Penalty', band: 'STANDARD', price: '$29.99', mail: 'none' },
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
      <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Pay per workflow plus mailing costs. No subscriptions, no hidden fees.
      </p>

      {/* Workflow pricing */}
      <h2 style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.75rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'oklch(0.45 0.14 255)',
        marginBottom: '1rem',
        borderBottom: '1px solid oklch(0.88 0.012 82)',
        paddingBottom: '0.5rem',
      }}>
        Workflow Preparation Fees
      </h2>
      <div style={{ overflowX: 'auto', marginBottom: '2.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid oklch(0.88 0.012 82)' }}>
              <th style={thStyle}>Workflow</th>
              <th style={thStyle}>Tier</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Price</th>
              <th style={thStyle}>Mail Included</th>
            </tr>
          </thead>
          <tbody>
            {WORKFLOW_PRICING.map((w) => (
              <tr key={w.id} style={{ borderBottom: '1px solid oklch(0.88 0.012 82)' }}>
                <td style={tdStyle}>{w.name}</td>
                <td style={tdStyle}>
                  <span style={bandBadge(w.band)}>{w.band}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                  {w.price}
                </td>
                <td style={tdStyle}>{w.mail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mail pricing */}
      <h2 style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.75rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'oklch(0.45 0.14 255)',
        marginBottom: '1rem',
        borderBottom: '1px solid oklch(0.88 0.012 82)',
        paddingBottom: '0.5rem',
      }}>
        Mailing Options
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {MAIL_PRICING.map((m) => (
          <div key={m.class} style={{
            padding: '1.5rem',
            background: 'oklch(0.992 0.004 85)',
            border: '1px solid oklch(0.88 0.012 82)',
            borderRadius: '0.625rem',
            boxShadow: '0 1px 6px -1px rgba(0,0,0,0.08)',
          }}>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.75rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'oklch(0.45 0.14 255)',
              marginBottom: '0.5rem',
            }}>
              {m.class}
            </p>
            <p style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginBottom: '0.25rem' }}>
              {m.price}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'oklch(0.44 0.03 255)' }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Additional costs */}
      <div style={{
        padding: '1.5rem',
        background: 'oklch(0.955 0.012 82)',
        borderRadius: '0.625rem',
        marginBottom: '2.5rem',
      }}>
        <h3 style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'oklch(0.45 0.14 255)',
          marginBottom: '0.75rem',
        }}>
          Additional Costs
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'oklch(0.26 0.035 255)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          <li>Color printing: $0.50 per page</li>
          <li>Mail class surcharge: applied per the pricing engine</li>
          <li>No subscription fees — pay only when you mail</li>
        </ul>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <Link
          href="/start"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.875rem 2rem',
            background: 'oklch(0.26 0.035 255)',
            color: 'oklch(0.975 0.008 85)',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            textDecoration: 'none',
          }}
        >
          Start Now
        </Link>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 0.75rem',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '0.7rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'oklch(0.44 0.03 255)',
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  fontSize: '0.9rem',
  color: 'oklch(0.26 0.035 255)',
}

function bandBadge(band: string): React.CSSProperties {
  const colors: Record<string, string> = {
    ESSENTIAL: 'oklch(0.62 0.07 75)',
    STANDARD: 'oklch(0.45 0.14 255)',
    ADVANCED: 'oklch(0.54 0.16 28)',
  }
  return {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    fontFamily: 'JetBrains Mono, monospace',
    color: colors[band] || 'oklch(0.44 0.03 255)',
    background: 'oklch(0.955 0.012 82)',
  }
}
