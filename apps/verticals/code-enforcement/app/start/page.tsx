import Link from 'next/link'

export const metadata = {
  title: 'Start a Case — Code Enforcement',
  description: 'Upload a code enforcement notice, enter an address or case number, and get an evidence-backed action plan.',
}

export default function StartPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Start a Code Enforcement Case
      </h1>
      <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Upload your notice, enter your case details, and get an evidence-backed response plan.
      </p>

      <div style={{
        background: 'oklch(0.992 0.004 85)',
        border: '1px solid oklch(0.88 0.012 82)',
        borderRadius: '0.625rem',
        padding: '2rem',
        boxShadow: '0 1px 6px -1px rgba(0,0,0,0.08)',
      }}>
        {/* Upload zone */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'oklch(0.45 0.14 255)',
            marginBottom: '0.5rem',
          }}>
            Upload Notice
          </label>
          <div style={{
            border: '2px dashed oklch(0.88 0.012 82)',
            borderRadius: '0.5rem',
            padding: '2rem',
            textAlign: 'center',
            color: 'oklch(0.44 0.03 255)',
            cursor: 'pointer',
          }}>
            <p style={{ fontSize: '0.9rem' }}>Drop your code enforcement notice here, or click to browse</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>PDF, PNG, JPG up to 25MB</p>
          </div>
        </div>

        {/* Case identifiers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Case Number</label>
            <input style={inputStyle} placeholder="e.g., CE-2026-01234" />
          </div>
          <div>
            <label style={labelStyle}>Citation Number</label>
            <input style={inputStyle} placeholder="e.g., CIT-2026-456" />
          </div>
        </div>

        {/* Property address */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Property Address</label>
          <input style={inputStyle} placeholder="Enter the property address" />
        </div>

        {/* Paste text */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Or Paste Notice Text</label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
            placeholder="Paste the text of your code enforcement notice here..."
          />
        </div>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '0.75rem 1.5rem',
            background: 'oklch(0.26 0.035 255)',
            color: 'oklch(0.975 0.008 85)',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          Analyze My Case
        </Link>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'oklch(0.44 0.03 255)', textAlign: 'center' }}>
        We identify jurisdiction, alleged violations, dates, deadlines, and requested actions.
        You review everything before anything goes out.
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
  color: 'oklch(0.45 0.14 255)',
  marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid oklch(0.88 0.012 82)',
  borderRadius: '0.375rem',
  fontSize: '0.9rem',
  background: 'white',
  color: 'oklch(0.26 0.035 255)',
  outline: 'none',
}
