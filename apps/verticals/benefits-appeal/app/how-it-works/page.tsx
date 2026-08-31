import Link from 'next/link'

export const metadata = {
  title: 'How It Works — Benefits Appeal',
  description: 'Understand the appeal process: upload your denial, we analyze grounds, organize evidence, draft your appeal, and mail it with certified proof.',
}

const STEPS = [
  { n: '01', title: 'Upload Your Decision', desc: 'Drop your denial letter or paste the text. We identify the agency, decision type, denial reasons, and appeal deadline.' },
  { n: '02', title: 'Decision X-Ray', desc: 'Deep analysis of the decision: what was denied, why, what evidence was considered, what was ignored, and what deadlines apply.' },
  { n: '03', title: 'Timeline & Deadlines', desc: 'Build a chronology from your documents. Calculate the appeal deadline and key milestones. Distinguish extracted facts from inference.' },
  { n: '04', title: 'Appeal Grounds', desc: 'Identify procedural errors, factual errors, missing evidence, legal/policy misapplication. Each ground is source-linked to the decision.' },
  { n: '05', title: 'Evidence Organization', desc: 'Upload supporting documents. Match evidence to each appeal ground. Identify gaps — what evidence is needed but missing.' },
  { n: '06', title: 'Strategy & Draft', desc: 'Develop arguments for each ground. AI-assisted drafting grounded in your case documents. Every assertion source-linked.' },
  { n: '07', title: 'Stress Test', desc: 'Independent validation: check for unsupported claims, weak arguments, missing information, and deadline compliance before you review.' },
  { n: '08', title: 'Review & Approve', desc: 'You review the complete packet — draft, evidence, recipient, mailing method. Nothing goes out without your explicit approval.' },
  { n: '09', title: 'Mail with Certified Proof', desc: 'Print, stamp, and mail via Lob. Certified mail recommended for appeal deadlines. Tracking and proof of delivery captured automatically.' },
  { n: '10', title: 'Track & Prove', desc: 'Real-time tracking. Immutable proof packet sealed and archived — mailing date, recipient, method, tracking, delivery confirmation.' },
]

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.75rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        How It Works
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.15rem', marginBottom: '2.5rem' }}>
        Understand the decision. Build the appeal. Mail it with proof.
      </p>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '3rem',
        padding: '1rem', background: 'rgba(15,23,42,0.6)', borderRadius: '0.5rem',
      }}>
        {['Decision', 'X-Ray', 'Timeline', 'Grounds', 'Evidence', 'Strategy', 'Draft', 'Test', 'Review', 'Mail', 'Track', 'Prove'].map((step, i) => (
          <span key={step} style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: i < 2 ? '#a78bfa' : '#64748b', whiteSpace: 'nowrap',
          }}>{step}{i < 11 && ' →'}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '1.5rem', fontWeight: 600,
              color: '#a78bfa', minWidth: '3rem', opacity: 0.5,
            }}>{step.n}</span>
            <div>
              <h3 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.4rem', fontWeight: 400, marginBottom: '0.375rem' }}>
                {step.title}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '3rem', padding: '1.5rem',
        background: 'rgba(15,23,42,0.6)', borderRadius: '0.625rem',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h3 style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.75rem',
        }}>AI Classification</h3>
        <p style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: '0.75rem' }}>Every AI output is classified:</p>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <li style={{ fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid #a78bfa', paddingLeft: '0.5rem' }}>Fact — supported by evidence</li>
          <li style={{ fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid #a78bfa', paddingLeft: '0.5rem' }}>Inference — reasoned from evidence</li>
          <li style={{ fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid #a78bfa', paddingLeft: '0.5rem' }}>Unknown — evidence is missing</li>
          <li style={{ fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid #a78bfa', paddingLeft: '0.5rem' }}>Rule — from policy source</li>
          <li style={{ fontSize: '0.8rem', color: '#94a3b8', borderLeft: '2px solid #a78bfa', paddingLeft: '0.5rem' }}>Recommendation — proposed action</li>
        </ul>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link href="/start" style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.875rem 2rem',
          background: '#a78bfa', color: '#0a0f1a', borderRadius: '0.5rem',
          fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
        }}>Start an Appeal</Link>
      </div>
    </div>
  )
}
