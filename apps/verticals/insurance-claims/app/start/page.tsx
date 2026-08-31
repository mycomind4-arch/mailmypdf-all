import Link from 'next/link'

export const metadata = {
  title: 'Start a Claim — Insurance Claims',
  description: 'Upload your insurance denial. We analyze it, identify appeal grounds, organize evidence, draft your appeal, and mail it with proof.',
}

export default function StartPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Start an Insurance Appeal
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Upload your denial letter. We identify the grounds, organize your evidence, and draft the appeal.
      </p>
      <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Upload Denial</label>
          <div style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', color: '#64748b', cursor: 'pointer' }}>
            <p style={{ fontSize: '0.9rem' }}>Drop your denial letter here</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>PDF, PNG, JPG up to 25MB</p>
          </div>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Claim Type</label>
          <select style={inputStyle}>
            <option value="">Select claim type...</option>
            <option value="denied-insurance-claim">Denied Insurance Claim</option>
            <option value="appeal-insurance-denial">Appeal Insurance Denial</option>
            <option value="health-insurance-denial">Health Insurance Denial</option>
            <option value="medical-necessity-appeal">Medical Necessity Appeal</option>
            <option value="prior-authorization-denial">Prior Authorization Denial</option>
            <option value="insurance-coverage-denial">Insurance Coverage Denial</option>
            <option value="insurance-denial-letter">Insurance Denial Letter</option>
            <option value="roof-insurance-claim">Roof Insurance Claim</option>
            <option value="water-damage-claim">Water Damage Claim</option>
            <option value="fire-damage-claim">Fire Damage Claim</option>
            <option value="auto-insurance-claim">Auto Insurance Claim</option>
            <option value="life-insurance-denial">Life Insurance Denial</option>
            <option value="disability-insurance-denial">Disability Insurance Denial</option>
          </select>
        </div>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.75rem 1.5rem', background: '#67e8f9', color: '#0a0f1a', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
          Analyze My Denial
        </Link>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#67e8f9', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', fontSize: '0.9rem', background: 'rgba(15,23,42,0.8)', color: '#f8fafc', outline: 'none' }
