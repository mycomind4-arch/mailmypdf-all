# Benefits Appeal Site Design

## Position

Benefits Appeal is the evidence-first decision-to-appeal product in the MailMyPDF family.

Primary message: **Understand the decision. Build the appeal. Mail it with proof.**

The site should feel like a serious casework application, not a generic AI letter generator.

## Visual direction

Use the existing Notice Respond implementation as the benchmark for hierarchy, spacing, typography, borders, paper surfaces, responsive behavior, and accessibility. Keep Benefits Appeal's own identity through its stamp/evidence accent and appeal-specific language.

Tone: calm, analytical, protective, credible.

## Homepage

1. Header with Benefits Appeal identity, Workflows, How it works, Trust, and primary Start an Appeal CTA.
2. Hero: decision/denial → evidence-backed appeal → MailMyPDF proof.
3. Workflow strip: Understand → Analyze → Issues → Evidence → Strategy → Draft → Review → Mail → Prove.
4. Trust bar: source-linked findings, user review, no fabricated facts, explicit mailing authorization.
5. Workflow catalog by category: Insurance, Disability & Social Security, Unemployment, Government Benefits, Workers' Compensation, Veterans, Administrative.
6. Appeal analysis capabilities: Appeal X-Ray, Timeline, Evidence, Stress Test, Drafting, Validation.
7. Concrete case journey with document cards and evidence relationships.
8. MailMyPDF bridge: "Ready to send? Mail this appeal." Explain printing, postage, tracking, and proof.
9. FAQ and legal/safety disclaimer.
10. Ecosystem footer.

Do not say "Coming Soon" on public catalog pages. Catalog completeness and executable runtime are separate concerns.

## Workflow pages

Every catalog page must be meaningful and domain-specific:

- title and concise outcome
- who the workflow is for
- decision/problem it addresses
- useful documents
- what Benefits Appeal analyzes
- issues and evidence model
- resulting appeal contents
- review/safety controls
- next action
- MailMyPDF relationship
- related workflows

Insurance Appeal is the flagship executable workflow and must receive the deepest application UI.

## Application shell

Use a persistent case progression:

Decision → Understanding → Analysis → Issues → Evidence → Strategy → Draft → Review → Mail → Proof

Show actual case state. Never simulate analysis or mailing.

## Insurance Appeal workspace

The key screen should make the case understandable at a glance:

- decision summary
- important dates/deadline
- detected issues
- evidence supporting each issue
- contradictions/missing evidence
- strategy strength
- draft status
- validation warnings
- MailMyPDF send action

Use source-linked findings and visible uncertainty states.

## Interaction quality

Polish loading, empty, warning, blocked, partial-result, and completion states. Every important action needs a clear next step. Mobile must preserve the case hierarchy rather than simply stacking desktop cards.

## MailMyPDF handoff

The final CTA should be contextual:

**Mail this appeal with MailMyPDF →**

The handoff must preserve the final reviewed document and make fulfillment status explicit.

## Guardrails

Never claim legal advice. Never fabricate facts, evidence, deadlines, or mailing results. Never expose catalog-only workflows as executable.
