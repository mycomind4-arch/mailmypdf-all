import Link from 'next/link'

export const metadata = {
  title: 'How It Works — Insurance Claims',
  description: 'Understand the insurance appeal process: upload your denial, we analyze grounds, organize evidence, draft your appeal, and mail it with certified proof.',
}

const STEPS = [
  { n: '01', title: 'Upload Your Denial', desc: 'Drop your denial letter or paste the text. We identify the insurer, claim type, denial reasons, and appeal deadline.' },
  { n: '02', title: 'Decision X-Ray', desc: 'Deep analysis: what was denied, why, what evidence was considered, what was ignored, and what policy language applies.' },
  { n: '03', title: 'Timeline & Deadlines', desc: 'Build a chronology. Calculate the appeal deadline. Distinguish extracted facts from inference.' },
  { n: '04', title: 'Appeal Grounds', desc: 'Identify procedural errors, factual errors, missing evidence, policy misapplication. Each ground is source-linked.' },
  { n: '05', title: 'Evidence', desc: 'Upload supporting documents. Match evidence to each ground. Identify gaps.' },
  { n: '06', title: 'Strategy & Draft', desc: 'Develop arguments. AI-assisted drafting grounded in your documents. Every assertion source-linked.' },
  { n: '07', title: 'Stress Test', desc: 'Independent validation before you review: unsupported claims, weak arguments, missing info, deadline compliance.' },
  { n: '08', title: 'Review & Approve', desc: 'You review the complete packet. Nothing goes out without your explicit approval.' },
  { n: '09', title: 'Mail with Proof', desc: 'Print, stamp, mail via Lob. Certified mail recommended. Tracking and proof captured automatically.' },
  { n: '10', title: 'Track & Prove', desc: 'Real-time tracking. Immutable proof packet sealed and archived.' },
]

export default function HowItWorksPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.75rem', fontWeight: 400, marginBottom: '0.5rem' }}>How It Works</h1>
      <p style={{ color: '#94a3b8', fontSize: '1.15rem', marginBottom: '2.5rem' }}>Understand the denial. Build the appeal. Mail it with proof.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.5rem', fontWeight: 600, color: '#67e8f9', minWidth: '3rem', opacity: 0.5 }}>{step.n}</span>
            <div>
              <h3 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.4rem', fontWeight: 400, marginBottom: '0.375rem' }}>{step.title}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link href="/start" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.875rem 2rem', background: '#67e8f9', color: '#0a0f1a', borderRadius: '0.5rem', fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>Start a Claim</Link>
      </div>
    </div>
  )
}
