# Appeal Mail — Product Design Direction

## Role in the MailMyPDF family

Appeal Mail is the specialized decision-to-appeal product. MailMyPDF is the fulfillment layer.

Primary journey:

**Decision → Understand → Analyze → Issues → Evidence → Strategy → Draft → Review → Mail → Track → Prove**

## Design benchmark

Notice Respond is the visual and interaction-quality benchmark. Reuse its typography, spacing, card language, responsive behavior, accessibility patterns, workflow discovery patterns, and postal-document visual vocabulary. Do not clone its copy or domain language.

## Product personality

Calm, authoritative, evidence-first, procedural, reassuring. The interface should feel like a serious case workspace rather than a generic AI SaaS product.

## Visual language

- Warm paper background and restrained ink/navy typography
- Postal red/stamp accent for actions and important status
- Serif display typography for editorial hierarchy
- Monospace labels for dates, status, references, and workflow metadata
- Thin rules, document/envelope cards, evidence tags, timeline markers
- Avoid glossy gradients, excessive glassmorphism, generic AI imagery, and dashboard clutter

## Homepage hierarchy

1. Clear decision-to-appeal promise
2. Visual workflow: Understand → Analyze → Evidence → Prepare → Review → Mail → Track → Prove
3. Appeal-type directory
4. Trust/safety and source-grounding
5. Product intelligence features
6. MailMyPDF fulfillment relationship
7. FAQ and final CTA

## Workflow page hierarchy

- What decision/problem is this for?
- Who is it for?
- Documents to gather
- What Appeal Mail analyzes
- Findings/issues
- Evidence organization
- Strategy and draft
- Review/validation
- MailMyPDF handoff

Catalog pages may be polished and complete without claiming unsupported execution. Only registered executable workflows receive executable CTAs.

## Application workspace

Use a progressive case-workspace layout:

**Case header → decision summary → findings → timeline → evidence → strategy → draft → validation → mailing**

Important findings should be source-linked. Unknown, inferred, conflicting, and documented facts must remain visually distinct.

## States

Every workflow stage needs intentional loading, empty, partial-result, warning, error, success, and review states. Never simulate analysis or mailing.

## Responsive behavior

Desktop may use two-column evidence/detail layouts. Mobile must collapse into a single reading/review flow with sticky primary actions and accessible source references.

## Accessibility

Maintain keyboard navigation, visible focus, semantic headings, sufficient contrast, descriptive labels, reduced-motion support, and non-color-only status communication.

## Definition of done

Appeal Mail should feel like a finished specialized MailMyPDF product while remaining honest about which workflows are actually executable.
