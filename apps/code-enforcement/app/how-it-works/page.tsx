import Link from 'next/link'

export const metadata = {
  title: 'How It Works — Code Enforcement',
  description: 'Understand the code enforcement process: upload your notice, we analyze it, build your response, and mail it with certified proof.',
}

const STEPS = [
  {
    n: '01',
    title: 'Upload or Paste Your Notice',
    desc: 'Drop a PDF, photo, or paste the text of your code enforcement notice. Enter your address, case number, or citation number.',
  },
  {
    n: '02',
    title: 'We Identify the Details',
    desc: 'The system identifies jurisdiction, alleged violations, ordinance/code references, inspection dates, compliance deadlines, and requested actions.',
  },
  {
    n: '03',
    title: 'Evidence-Backed Analysis',
    desc: 'We run deterministic checks: notice completeness, deadline calculation, procedural issues, missing evidence, and contradictions. Every finding is source-linked.',
  },
  {
    n: '04',
    title: 'Choose Your Strategy',
    desc: 'Based on the analysis, we recommend an action plan: cure the violation, request an extension, submit proof of correction, request a hearing, dispute the citation, or appeal the decision.',
  },
  {
    n: '05',
    title: 'Draft Your Response',
    desc: 'AI-assisted drafting grounded in your case documents. Every assertion is source-linked. The system distinguishes facts from inference from unknown.',
  },
  {
    n: '06',
    title: 'Review and Approve',
    desc: 'You review the complete packet — draft, evidence, recipient, mailing method. Nothing goes out without your explicit approval.',
  },
  {
    n: '07',
    title: 'Mail with Certified Proof',
    desc: 'We print, stamp, and mail via Lob. Choose Standard, Certified, or Registered mail. Tracking and proof of delivery are captured automatically.',
  },
  {
    n: '08',
    title: 'Track and Prove',
    desc: 'Real-time tracking from mailing to delivery. An immutable proof packet is sealed and archived — mailing date, recipient, method, tracking, delivery confirmation.',
  },
]

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.75rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        How It Works
      </h1>
      <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.15rem', marginBottom: '3rem' }}>
        Understand the violation. Build your response. Mail it with proof.
      </p>

      {/* Pipeline strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '3rem',
        padding: '1rem',
        background: 'oklch(0.955 0.012 82)',
        borderRadius: '0.5rem',
      }}>
        {['Intake', 'Analyze', 'Evidence', 'Timeline', 'Strategy', 'Draft', 'Validate', 'Review', 'Mail', 'Track', 'Prove'].map((step, i) => (
          <span key={step} style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.7rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: i < 2 ? 'oklch(0.45 0.14 255)' : 'oklch(0.44 0.03 255)',
            whiteSpace: 'nowrap',
          }}>
            {step}{i < 10 && ' →'}
          </span>
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'oklch(0.45 0.14 255)',
              minWidth: '3rem',
              opacity: 0.5,
            }}>
              {step.n}
            </span>
            <div>
              <h3 style={{
                fontFamily: 'Instrument Serif, Georgia, serif',
                fontSize: '1.4rem',
                fontWeight: 400,
                marginBottom: '0.375rem',
              }}>
                {step.title}
              </h3>
              <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* AI classification section */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'oklch(0.955 0.012 82)',
        borderRadius: '0.625rem',
        border: '1px solid oklch(0.88 0.012 82)',
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
          AI Classification
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)', marginBottom: '0.75rem' }}>
          Every AI output is classified so you always know what you're looking at:
        </p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <li style={classBadge('Fact')}>Fact — directly supported by evidence</li>
          <li style={classBadge('Inference')}>Inference — reasoned from evidence</li>
          <li style={classBadge('Unknown')}>Unknown — evidence is missing</li>
          <li style={classBadge('Rule')}>Rule — from a jurisdiction policy source</li>
          <li style={classBadge('Recommendation')}>Recommendation — proposed action</li>
        </ul>
      </div>

      {/* CTA */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
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
          Start a Case
        </Link>
      </div>
    </div>
  )
}

function classBadge(label: string): React.CSSProperties {
  return {
    fontSize: '0.8rem',
    color: 'oklch(0.26 0.035 255)',
    padding: '0.25rem 0.5rem',
    borderLeft: '2px solid oklch(0.45 0.14 255)',
  }
}
