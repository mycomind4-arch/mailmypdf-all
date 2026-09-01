import { headers } from 'next/headers'
import Link from 'next/link'

export const metadata = {
  title: 'Start a Case — Code Enforcement',
  description: 'Upload a code enforcement notice, enter an address or case number, and get an evidence-backed action plan.',
}

const WORKFLOW_NAMES: Record<string, string> = {
  'respond-to-code-violation-notice': 'Respond to Code Violation Notice',
  'respond-to-notice-of-violation': 'Respond to Notice of Violation',
  'respond-to-property-maintenance-violation': 'Respond to Property Maintenance Violation',
  'respond-to-building-code-violation': 'Respond to Building Code Violation',
  'respond-to-zoning-violation': 'Respond to Zoning Violation',
  'respond-to-unpermitted-construction-notice': 'Respond to Unpermitted Construction Notice',
  'request-code-enforcement-extension': 'Request Code Enforcement Extension',
  'request-additional-time-to-correct-violations': 'Request Additional Time to Correct Violations',
  'submit-proof-of-correction': 'Submit Proof of Correction',
  'request-reinspection': 'Request Reinspection',
  'dispute-code-enforcement-citation': 'Dispute Code Enforcement Citation',
  'appeal-code-enforcement-decision': 'Appeal Code Enforcement Decision',
  'request-administrative-hearing': 'Request Administrative Hearing',
  'respond-to-abatement-notice': 'Respond to Abatement Notice',
  'dispute-code-enforcement-fine': 'Dispute Code Enforcement Fine/Penalty',
  'request-case-status': 'Request Case Status',
  'request-inspection-records': 'Request Inspection Records',
  'compliance-confirmation': 'Compliance Confirmation Letter',
  'request-case-closure': 'Request Case Closure',
  'penalty-reduction-request': 'Penalty Reduction Request',
  'payment-plan-request': 'Payment Plan Request',
  'voluntary-compliance-agreement': 'Voluntary Compliance Agreement',
  'respond-to-nuisance-violation': 'Respond to Nuisance Violation',
  'respond-to-trash-debris-violation': 'Respond to Trash/Debris Violation',
  'respond-to-vegetation-violation': 'Respond to Vegetation Violation',
  'respond-to-unsafe-structure-notice': 'Respond to Unsafe Structure Notice',
  'respond-to-vacant-property-notice': 'Respond to Vacant Property Notice',
  'respond-to-illegal-occupancy-notice': 'Respond to Illegal Occupancy Notice',
  'respond-to-signage-violation': 'Respond to Signage Violation',
  'respond-to-fence-setback-violation': 'Respond to Fence/Setback Violation',
  'respond-to-short-term-rental-notice': 'Respond to Short-Term Rental Notice',
  'request-supervisor-review': 'Request Supervisor Review',
  'request-administrative-review': 'Request Administrative Review',
  'hearing-continuance-request': 'Hearing Continuance Request',
  'submit-supplemental-evidence': 'Submit Supplemental Evidence',
  'challenge-inspection-findings': 'Challenge Inspection Findings',
  'challenge-abatement-action': 'Challenge Abatement Action',
  'appeal-citation': 'Appeal Citation',
}

export default async function StartPage() {
  const referer = (await headers()).get('referer') ?? ''
  const match = referer.match(/\/workflows\/([^/?#]+)/)
  const slug = match?.[1] && WORKFLOW_NAMES[match[1]] ? match[1] : null
  const workflowName = slug ? WORKFLOW_NAMES[slug] : 'Code Enforcement Case'

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Link href={slug ? `/workflows/${slug}` : '/workflows'} style={{ fontSize: '0.85rem', color: 'oklch(0.44 0.03 255)', textDecoration: 'none', marginBottom: '1.5rem', display: 'inline-block' }}>
        ← Back to {slug ? 'workflow' : 'all workflows'}
      </Link>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '0.5rem' }}>
          START WORKFLOW{slug ? ` · ${slug}` : ''}
        </div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
          {workflowName}
        </h1>
        <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.1rem', marginBottom: 0 }}>
          {slug ? 'Start with the notice or record that triggered this workflow. Your selected workflow is preserved throughout the intake.' : 'Upload your notice, enter your case details, and get an evidence-backed response plan.'}
        </p>
      </div>

      <div style={{ background: 'oklch(0.992 0.004 85)', border: '1px solid oklch(0.88 0.012 82)', borderRadius: '0.625rem', padding: '2rem', boxShadow: '0 1px 6px -1px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Upload Notice</label>
          <div style={{ border: '2px dashed oklch(0.88 0.012 82)', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', color: 'oklch(0.44 0.03 255)' }}>
            <p style={{ fontSize: '0.9rem' }}>Choose the source document for this workflow</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>PDF, PNG, JPG up to 25MB</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div><label style={labelStyle}>Case Number</label><input style={inputStyle} placeholder="e.g., CE-2026-01234" /></div>
          <div><label style={labelStyle}>Citation Number</label><input style={inputStyle} placeholder="e.g., CIT-2026-456" /></div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}><label style={labelStyle}>Property Address</label><input style={inputStyle} placeholder="Enter the property address" /></div>
        <div style={{ marginBottom: '1.5rem' }}><label style={labelStyle}>Or Paste Notice Text</label><textarea style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} placeholder="Paste the text of your code enforcement notice here..." /></div>

        <Link href={slug ? `/dashboard?workflow=${encodeURIComponent(slug)}` : '/dashboard'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.75rem 1.5rem', background: 'oklch(0.26 0.035 255)', color: 'oklch(0.975 0.008 85)', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}>
          Begin {slug ? workflowName : 'Code Enforcement Case'} →
        </Link>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'oklch(0.44 0.03 255)', textAlign: 'center' }}>
        You review everything before anything goes out.
      </p>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.75rem', border: '1px solid oklch(0.88 0.012 82)', borderRadius: '0.375rem',
  fontSize: '0.9rem', background: 'white', color: 'oklch(0.26 0.035 255)', outline: 'none',
}
