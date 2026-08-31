import Link from 'next/link'

export const metadata = {
  title: 'Workflows — Code Enforcement',
  description: 'Browse code enforcement workflow types: respond to violations, request extensions, submit proof of correction, request reinspection, dispute citations, appeal decisions, and more.',
}

const TIER_1 = [
  { slug: 'respond-to-code-violation-notice', name: 'Respond to Code Violation Notice' },
  { slug: 'respond-to-notice-of-violation', name: 'Respond to Notice of Violation' },
  { slug: 'respond-to-property-maintenance-violation', name: 'Respond to Property Maintenance Violation' },
  { slug: 'respond-to-building-code-violation', name: 'Respond to Building Code Violation' },
  { slug: 'respond-to-zoning-violation', name: 'Respond to Zoning Violation' },
  { slug: 'respond-to-unpermitted-construction-notice', name: 'Respond to Unpermitted Construction Notice' },
  { slug: 'request-code-enforcement-extension', name: 'Request Code Enforcement Extension' },
  { slug: 'request-additional-time-to-correct-violations', name: 'Request Additional Time to Correct Violations' },
  { slug: 'submit-proof-of-correction', name: 'Submit Proof of Correction' },
  { slug: 'request-reinspection', name: 'Request Reinspection' },
  { slug: 'dispute-code-enforcement-citation', name: 'Dispute Code Enforcement Citation' },
  { slug: 'appeal-code-enforcement-decision', name: 'Appeal Code Enforcement Decision' },
  { slug: 'request-administrative-hearing', name: 'Request Administrative Hearing' },
  { slug: 'respond-to-abatement-notice', name: 'Respond to Abatement Notice' },
  { slug: 'dispute-code-enforcement-fine', name: 'Dispute Code Enforcement Fine/Penalty' },
]

const TIER_2 = [
  { slug: 'request-case-status', name: 'Request Case Status' },
  { slug: 'request-inspection-records', name: 'Request Inspection Records' },
  { slug: 'compliance-confirmation', name: 'Compliance Confirmation Letter' },
  { slug: 'request-case-closure', name: 'Request Case Closure' },
  { slug: 'penalty-reduction-request', name: 'Penalty Reduction Request' },
  { slug: 'payment-plan-request', name: 'Payment Plan Request' },
  { slug: 'voluntary-compliance-agreement', name: 'Voluntary Compliance Agreement' },
]

const TIER_3 = [
  { slug: 'respond-to-nuisance-violation', name: 'Respond to Nuisance Violation' },
  { slug: 'respond-to-trash-debris-violation', name: 'Respond to Trash/Debris Violation' },
  { slug: 'respond-to-vegetation-violation', name: 'Respond to Vegetation Violation' },
  { slug: 'respond-to-unsafe-structure-notice', name: 'Respond to Unsafe Structure Notice' },
  { slug: 'respond-to-vacant-property-notice', name: 'Respond to Vacant Property Notice' },
  { slug: 'respond-to-illegal-occupancy-notice', name: 'Respond to Illegal Occupancy Notice' },
  { slug: 'respond-to-signage-violation', name: 'Respond to Signage Violation' },
  { slug: 'respond-to-fence-setback-violation', name: 'Respond to Fence/Setback Violation' },
  { slug: 'respond-to-short-term-rental-notice', name: 'Respond to Short-Term Rental Notice' },
]

const TIER_4 = [
  { slug: 'request-supervisor-review', name: 'Request Supervisor Review' },
  { slug: 'request-administrative-review', name: 'Request Administrative Review' },
  { slug: 'hearing-continuance-request', name: 'Hearing Continuance Request' },
  { slug: 'submit-supplemental-evidence', name: 'Submit Supplemental Evidence' },
  { slug: 'challenge-inspection-findings', name: 'Challenge Inspection Findings' },
  { slug: 'challenge-abatement-action', name: 'Challenge Abatement Action' },
  { slug: 'appeal-citation', name: 'Appeal Citation' },
]

const TIERS = [
  { title: 'Core Response Workflows', workflows: TIER_1 },
  { title: 'Supporting Workflows', workflows: TIER_2 },
  { title: 'Specialized Property Situations', workflows: TIER_3 },
  { title: 'Escalation Workflows', workflows: TIER_4 },
]

export default function WorkflowsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Code Enforcement Workflows
      </h1>
      <p style={{ color: 'oklch(0.44 0.03 255)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Understand the violation. Build your response. Mail it with proof.
      </p>

      {TIERS.map((tier) => (
        <section key={tier.title} style={{ marginBottom: '2.5rem' }}>
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
            {tier.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {tier.workflows.map((w) => (
              <Link
                key={w.slug}
                href={`/workflows/${w.slug}`}
                style={{
                  display: 'block',
                  padding: '1rem 1.25rem',
                  background: 'oklch(0.992 0.004 85)',
                  border: '1px solid oklch(0.88 0.012 82)',
                  borderRadius: '0.625rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 1px 6px -1px rgba(0,0,0,0.08)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{w.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
