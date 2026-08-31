import Link from 'next/link'

export const metadata = {
  title: 'Start an Appeal — Benefits Appeal',
  description: 'Upload your benefits denial decision. We analyze it, identify appeal grounds, organize evidence, draft your appeal, and mail it with proof.',
}

export default function StartPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Start an Appeal
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Upload your denial decision. We identify the grounds, organize your evidence, and draft the appeal.
      </p>

      <div style={{
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '2rem',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Upload Decision</label>
          <div style={{
            border: '2px dashed rgba(255,255,255,0.15)',
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            color: '#64748b',
            cursor: 'pointer',
          }}>
            <p style={{ fontSize: '0.9rem' }}>Drop your denial letter or decision here</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>PDF, PNG, JPG up to 25MB</p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Or Paste Decision Text</label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
            placeholder="Paste the text of your denial decision..."
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Appeal Type</label>
          <select style={inputStyle}>
            <option value="">Select the type of denial...</option>
            <option value="ssdi-denial">SSDI Denial</option>
            <option value="ssi-denial">SSI Denial</option>
            <option value="social-security-denial">Social Security Denial</option>
            <option value="medicaid-denial">Medicaid Denial</option>
            <option value="unemployment-denial">Unemployment Denial</option>
            <option value="edd-denial">EDD Denial</option>
            <option value="financial-aid-appeal">Financial Aid Appeal</option>
            <option value="fafsa-appeal">FAFSA Appeal</option>
            <option value="sap-appeal">SAP Appeal</option>
            <option value="scholarship-appeal">Scholarship Appeal</option>
            <option value="other">Other Benefits Denial</option>
          </select>
        </div>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: '#a78bfa',
            color: '#0a0f1a',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          Analyze My Decision
        </Link>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        We identify denial reasons, appeal grounds, deadlines, and missing evidence. You review everything before anything goes out.
      </p>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '0.75rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#a78bfa',
  marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  background: 'rgba(15,23,42,0.8)',
  color: '#f8fafc',
  outline: 'none',
}
