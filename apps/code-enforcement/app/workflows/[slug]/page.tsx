import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Workflow — Code Enforcement',
  description: 'Code enforcement workflow details, pricing, and what to prepare.',
}

// All workflow definitions matching the directory
const WORKFLOWS: Record<string, { name: string; tier: string; price: string; problem: string; recipient: string; documents: string[] }> = {
  'respond-to-code-violation-notice': {
    name: 'Respond to Code Violation Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You received a code violation notice and need to respond before the deadline.',
    recipient: 'Your local code enforcement agency',
    documents: ['The violation notice', 'Photos of the property', 'Any permits or corrections already made', 'Correspondence with the agency'],
  },
  'respond-to-notice-of-violation': {
    name: 'Respond to Notice of Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You received a formal Notice of Violation and need to respond or request a hearing.',
    recipient: 'Your local code enforcement agency',
    documents: ['The NOV document', 'Property records', 'Photos showing compliance or dispute basis', 'Any prior correspondence'],
  },
  'respond-to-property-maintenance-violation': {
    name: 'Respond to Property Maintenance Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for property maintenance issues (trash, overgrowth, disrepair).',
    recipient: 'Your local code enforcement agency',
    documents: ['The maintenance violation notice', 'Photos of the property current state', 'Records of maintenance performed', 'Weather or other extenuating circumstances'],
  },
  'respond-to-building-code-violation': {
    name: 'Respond to Building Code Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for building code violations (structural, electrical, plumbing).',
    recipient: 'Your local building department / code enforcement',
    documents: ['The building code violation notice', 'Contractor reports or permits', 'Inspection records', 'Photos of the work'],
  },
  'respond-to-zoning-violation': {
    name: 'Respond to Zoning Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for a zoning violation (use, setback, height, density).',
    recipient: 'Your local zoning / planning department',
    documents: ['The zoning violation notice', 'Property survey or plat map', 'Zoning verification letter', 'Prior use history'],
  },
  'respond-to-unpermitted-construction-notice': {
    name: 'Respond to Unpermitted Construction Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for construction without permits and need to respond or seek legalization.',
    recipient: 'Your local building department',
    documents: ['The unpermitted construction notice', 'Photos of the construction', 'Contractor statements', 'Any permits applied for retroactively'],
  },
  'request-code-enforcement-extension': {
    name: 'Request Code Enforcement Extension', tier: 'STANDARD', price: '$24.99',
    problem: 'You need more time to comply with a code enforcement deadline.',
    recipient: 'Your local code enforcement agency',
    documents: ['The original notice with deadline', 'Reason for the extension request', 'Evidence of progress toward compliance', 'Contractor timeline if applicable'],
  },
  'request-additional-time-to-correct-violations': {
    name: 'Request Additional Time to Correct Violations', tier: 'STANDARD', price: '$24.99',
    problem: 'You need additional time beyond the correction period to fix violations.',
    recipient: 'Your local code enforcement agency',
    documents: ['The correction notice', 'Evidence of work in progress', 'Contractor estimates or schedule', 'Photos of partial compliance'],
  },
  'submit-proof-of-correction': {
    name: 'Submit Proof of Correction', tier: 'STANDARD', price: '$24.99',
    problem: 'You have corrected the violations and need to submit proof to close the case.',
    recipient: 'Your local code enforcement agency',
    documents: ['Before and after photos', 'Contractor invoices or receipts', 'Permit close-out documents', 'Reinspection request'],
  },
  'request-reinspection': {
    name: 'Request Reinspection', tier: 'STANDARD', price: '$24.99',
    problem: 'You have corrected violations and want an inspector to verify compliance.',
    recipient: 'Your local code enforcement agency',
    documents: ['Original violation notice', 'Photos showing corrections', 'Contractor completion statements', 'Permit documentation'],
  },
  'dispute-code-enforcement-citation': {
    name: 'Dispute Code Enforcement Citation', tier: 'STANDARD', price: '$29.99',
    problem: 'You believe a citation was issued in error and want to dispute it.',
    recipient: 'Your local code enforcement agency or hearing board',
    documents: ['The citation', 'Evidence the violation does not exist', 'Photos of the property', 'Witness statements if applicable'],
  },
  'appeal-code-enforcement-decision': {
    name: 'Appeal Code Enforcement Decision', tier: 'ADVANCED', price: '$49.99',
    problem: 'You received an adverse decision and want to appeal it to a higher authority.',
    recipient: 'The appeals board or hearing authority',
    documents: ['The decision being appealed', 'The original notice', 'Evidence contradicting the decision', 'Procedural errors documentation'],
  },
  'request-administrative-hearing': {
    name: 'Request Administrative Hearing', tier: 'STANDARD', price: '$29.99',
    problem: 'You want to request a formal hearing to contest violations or present evidence.',
    recipient: 'Your local hearing authority',
    documents: ['The violation notice', 'Your defense evidence', 'Witness list if applicable', 'Prior correspondence with the agency'],
  },
  'respond-to-abatement-notice': {
    name: 'Respond to Abatement Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'The city plans to abate (fix and bill you for) a violation and you need to respond.',
    recipient: 'Your local code enforcement agency',
    documents: ['The abatement notice', 'Evidence of compliance or plan to comply', 'Cost estimates if you plan to self-correct', 'Photos of the property'],
  },
  'dispute-code-enforcement-fine': {
    name: 'Dispute Code Enforcement Fine/Penalty', tier: 'STANDARD', price: '$29.99',
    problem: 'You want to dispute or reduce fines and penalties assessed for code violations.',
    recipient: 'Your local code enforcement or hearing authority',
    documents: ['The fine/penalty notice', 'Evidence of compliance', 'Financial hardship documentation if requesting reduction', 'Procedural errors'],
  },
  // Tier 2
  'request-case-status': {
    name: 'Request Case Status', tier: 'STANDARD', price: '$24.99',
    problem: 'You need a formal status update on an ongoing code enforcement case.',
    recipient: 'Your local code enforcement agency',
    documents: ['Your case number', 'Prior correspondence', 'Questions about the case status'],
  },
  'request-inspection-records': {
    name: 'Request Inspection Records', tier: 'STANDARD', price: '$24.99',
    problem: 'You need inspection records related to your property or case.',
    recipient: 'Your local code enforcement or building department',
    documents: ['Your case number or address', 'Date range for inspections requested', 'Specific inspector names if known'],
  },
  'compliance-confirmation': {
    name: 'Compliance Confirmation Letter', tier: 'STANDARD', price: '$24.99',
    problem: 'You need to formally confirm compliance with code requirements.',
    recipient: 'Your local code enforcement agency',
    documents: ['Original violation notice', 'Evidence of compliance', 'Inspection results', 'Contractor documentation'],
  },
  'request-case-closure': {
    name: 'Request Case Closure', tier: 'STANDARD', price: '$24.99',
    problem: 'You have complied with all requirements and want the case officially closed.',
    recipient: 'Your local code enforcement agency',
    documents: ['Original violation notice', 'Proof of correction', 'Reinspection results', 'Any outstanding requirements resolved'],
  },
  'penalty-reduction-request': {
    name: 'Penalty Reduction Request', tier: 'STANDARD', price: '$29.99',
    problem: 'You want to request a reduction of penalties based on compliance or hardship.',
    recipient: 'Your local code enforcement or hearing authority',
    documents: ['The penalty notice', 'Evidence of compliance', 'Financial hardship documentation', 'Mitigating circumstances'],
  },
  'payment-plan-request': {
    name: 'Payment Plan Request', tier: 'STANDARD', price: '$24.99',
    problem: 'You need to request a payment plan for code enforcement fines.',
    recipient: 'Your local code enforcement or finance department',
    documents: ['The fine notice', 'Financial documentation', 'Proposed payment schedule', 'Evidence of good faith compliance'],
  },
  'voluntary-compliance-agreement': {
    name: 'Voluntary Compliance Agreement', tier: 'STANDARD', price: '$24.99',
    problem: 'You want to enter a voluntary compliance agreement instead of facing enforcement.',
    recipient: 'Your local code enforcement agency',
    documents: ['The violation notice', 'Proposed compliance timeline', 'Evidence of good faith', 'Plan for correction'],
  },
  // Tier 3
  'respond-to-nuisance-violation': {
    name: 'Respond to Nuisance Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for a nuisance violation (noise, odor, debris, etc.).',
    recipient: 'Your local code enforcement agency',
    documents: ['The nuisance violation notice', 'Photos of the property', 'Witness statements', 'Mitigation efforts'],
  },
  'respond-to-trash-debris-violation': {
    name: 'Respond to Trash/Debris Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for trash, debris, or waste accumulation on your property.',
    recipient: 'Your local code enforcement agency',
    documents: ['The violation notice', 'Before/after photos of cleanup', 'Disposal receipts', 'Explanatory circumstances'],
  },
  'respond-to-vegetation-violation': {
    name: 'Respond to Vegetation Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for overgrown vegetation, noxious weeds, or landscaping violations.',
    recipient: 'Your local code enforcement agency',
    documents: ['The violation notice', 'Photos of the property', 'Landscaping work receipts', 'Weather or seasonal factors'],
  },
  'respond-to-unsafe-structure-notice': {
    name: 'Respond to Unsafe Structure Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for an unsafe or dangerous structure on your property.',
    recipient: 'Your local building department / code enforcement',
    documents: ['The unsafe structure notice', 'Structural engineer reports', 'Photos of the structure', 'Repair or demolition plans'],
  },
  'respond-to-vacant-property-notice': {
    name: 'Respond to Vacant Property Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You received a notice regarding a vacant property registration or maintenance.',
    recipient: 'Your local code enforcement agency',
    documents: ['The vacant property notice', 'Photos of the property', 'Maintenance plan or security measures', 'Registration if required'],
  },
  'respond-to-illegal-occupancy-notice': {
    name: 'Respond to Illegal Occupancy Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for illegal occupancy (too many units, unauthorized use).',
    recipient: 'Your local code enforcement or zoning department',
    documents: ['The illegal occupancy notice', 'Lease or rental agreements', 'Property use history', 'Zoning verification'],
  },
  'respond-to-signage-violation': {
    name: 'Respond to Signage Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for a sign that violates local sign ordinances.',
    recipient: 'Your local code enforcement or planning department',
    documents: ['The signage violation notice', 'Photos of the sign', 'Sign permit if applicable', 'Sign ordinance reference'],
  },
  'respond-to-fence-setback-violation': {
    name: 'Respond to Fence/Setback Violation', tier: 'STANDARD', price: '$24.99',
    problem: 'You were cited for a fence or setback that does not meet code requirements.',
    recipient: 'Your local code enforcement or zoning department',
    documents: ['The violation notice', 'Property survey', 'Photos of the fence/structure', 'Setback requirements'],
  },
  'respond-to-short-term-rental-notice': {
    name: 'Respond to Short-Term Rental Notice', tier: 'STANDARD', price: '$24.99',
    problem: 'You received a notice regarding short-term rental (Airbnb/VRBO) violations.',
    recipient: 'Your local code enforcement or planning department',
    documents: ['The STR violation notice', 'Rental permit or license', 'Booking records', 'Neighbor complaints if relevant'],
  },
  // Tier 4
  'request-supervisor-review': {
    name: 'Request Supervisor Review', tier: 'STANDARD', price: '$29.99',
    problem: 'You want a code enforcement supervisor to review an inspector\'s findings.',
    recipient: 'Your local code enforcement supervisor',
    documents: ['The original citation or notice', 'Evidence the inspector erred', 'Prior correspondence', 'Photos'],
  },
  'request-administrative-review': {
    name: 'Request Administrative Review', tier: 'STANDARD', price: '$29.99',
    problem: 'You want an administrative review of a code enforcement decision.',
    recipient: 'Your local administrative review authority',
    documents: ['The decision being reviewed', 'Grounds for review', 'Supporting evidence', 'Procedural errors'],
  },
  'hearing-continuance-request': {
    name: 'Hearing Continuance Request', tier: 'STANDARD', price: '$24.99',
    problem: 'You need to postpone a scheduled hearing.',
    recipient: 'Your local hearing authority',
    documents: ['The hearing notice', 'Reason for continuance', 'Supporting documentation', 'Proposed new date'],
  },
  'submit-supplemental-evidence': {
    name: 'Submit Supplemental Evidence', tier: 'STANDARD', price: '$24.99',
    problem: 'You need to submit additional evidence after your initial response.',
    recipient: 'Your local code enforcement agency or hearing authority',
    documents: ['Your case number', 'The new evidence', 'Explanation of relevance', 'Prior submissions'],
  },
  'challenge-inspection-findings': {
    name: 'Challenge Inspection Findings', tier: 'STANDARD', price: '$29.99',
    problem: 'You disagree with an inspector\'s findings and want to challenge them.',
    recipient: 'Your local code enforcement agency',
    documents: ['The inspection report', 'Evidence contradicting findings', 'Photos of the property', 'Expert opinions if available'],
  },
  'challenge-abatement-action': {
    name: 'Challenge Abatement Action', tier: 'STANDARD', price: '$29.99',
    problem: 'The city performed abatement work and billed you — you want to challenge it.',
    recipient: 'Your local code enforcement agency or hearing authority',
    documents: ['The abatement notice and invoice', 'Evidence the violation was corrected', 'Photos of the property', 'Cost disputes'],
  },
  'appeal-citation': {
    name: 'Appeal Citation', tier: 'ADVANCED', price: '$49.99',
    problem: 'You want to formally appeal a citation to a higher authority.',
    recipient: 'Your local appeals board',
    documents: ['The citation', 'Grounds for appeal', 'Evidence supporting your case', 'Procedural errors'],
  },
}

export function generateStaticParams() {
  return Object.keys(WORKFLOWS).map(slug => ({ slug }))
}

export default async function WorkflowDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const workflow = WORKFLOWS[slug]
  if (!workflow) notFound()

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Breadcrumb */}
      <Link href="/workflows" style={{ fontSize: '0.85rem', color: 'oklch(0.44 0.03 255)', textDecoration: 'none', marginBottom: '1.5rem', display: 'inline-block' }}>
        ← All Workflows
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: workflow.tier === 'ADVANCED' ? 'oklch(0.54 0.16 28)' : 'oklch(0.45 0.14 255)',
          marginBottom: '0.5rem',
        }}>
          {workflow.tier} · {workflow.price} preparation
        </div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
          {workflow.name}
        </h1>
        <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.1rem' }}>{workflow.problem}</p>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.25rem', background: 'oklch(0.992 0.004 85)', border: '1px solid oklch(0.88 0.012 82)', borderRadius: '0.625rem' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '0.375rem' }}>Who you're writing to</p>
          <p style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>{workflow.recipient}</p>
        </div>
        <div style={{ padding: '1.25rem', background: 'oklch(0.992 0.004 85)', border: '1px solid oklch(0.88 0.012 82)', borderRadius: '0.625rem' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '0.375rem' }}>Cost</p>
          <p style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>
            <strong>{workflow.price}</strong> preparation + mailing fees
          </p>
          <p style={{ fontSize: '0.75rem', color: 'oklch(0.44 0.03 255)', marginTop: '0.25rem' }}>
            Standard $4.99 · Certified $14.94 · Registered $32.49
          </p>
        </div>
      </div>

      {/* Documents to gather */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '1rem', borderBottom: '1px solid oklch(0.88 0.012 82)', paddingBottom: '0.5rem' }}>
          Documents to Gather
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
          {workflow.documents.map((doc, i) => (
            <li key={i} style={{
              padding: '0.625rem 1rem', background: 'oklch(0.992 0.004 85)',
              border: '1px solid oklch(0.88 0.012 82)', borderRadius: '0.375rem',
              fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'oklch(0.45 0.14 255)', fontWeight: 600 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {doc}
            </li>
          ))}
        </ul>
      </div>

      {/* What we analyze */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '1rem', borderBottom: '1px solid oklch(0.88 0.012 82)', paddingBottom: '0.5rem' }}>
          What We Analyze
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            'Jurisdiction and applicable code',
            'Case number and citation references',
            'Alleged violations and ordinance citations',
            'Inspection dates and findings',
            'Compliance deadlines and cure periods',
            'Procedural requirements (notice, hearing)',
            'Evidence supporting or contradicting violations',
            'Options: cure, dispute, appeal, hearing',
          ].map((item) => (
            <div key={item} style={{
              padding: '0.625rem 0.75rem', fontSize: '0.85rem', color: 'oklch(0.26 0.035 255)',
              borderLeft: '2px solid oklch(0.45 0.14 255)',
            }}>{item}</div>
          ))}
        </div>
      </div>

      {/* Process */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'oklch(0.45 0.14 255)', marginBottom: '1rem', borderBottom: '1px solid oklch(0.88 0.012 82)', paddingBottom: '0.5rem' }}>
          The Process
        </h2>
        <ol style={{ paddingLeft: '1.5rem', display: 'grid', gap: '0.5rem' }}>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>Upload your notice and any supporting documents</li>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>We analyze the violation, deadlines, and applicable rules</li>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>We identify issues, discrepancies, and evidence gaps</li>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>We draft your response grounded in your case documents</li>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>You review and approve before anything is mailed</li>
          <li style={{ fontSize: '0.9rem', color: 'oklch(0.26 0.035 255)' }}>We mail via Lob with tracking and certified proof</li>
        </ol>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '2rem', background: 'oklch(0.955 0.012 82)', borderRadius: '0.625rem' }}>
        <Link href="/start" style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.875rem 2rem',
          background: 'oklch(0.26 0.035 255)', color: 'oklch(0.975 0.008 85)',
          borderRadius: '0.5rem', fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
        }}>
          Start This Workflow
        </Link>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'oklch(0.44 0.03 255)' }}>
          You review everything before anything goes out.
        </p>
      </div>
    </div>
  )
}
