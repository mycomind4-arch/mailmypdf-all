# Appeal Mail Design Standard

Updated: 2026-09-16

## Product character

Appeal Mail should feel calm, authoritative, evidence-first, procedural, and serious. It should look like a focused case workspace rather than a generic AI dashboard.

## Public pages

Public workflow pages are acquisition and explanation surfaces.

They may use:

- a workflow-specific hero image that also serves as the directory thumbnail;
- concise problem-specific copy;
- required documents and expected outputs;
- FAQ and structured SEO content;
- a clear authenticated start action.

Do not expose authenticated workspace chrome or admin controls on public pages.

## Authenticated workflow UI

Authenticated users do not need marketing copy or hero imagery.

The authenticated experience should prioritize:

- global MailMyPDF navigation;
- matter/workflow identity;
- current step and progress;
- source documents;
- structured findings;
- evidence and timeline;
- draft/review;
- readiness;
- mailing/fulfillment state.

The shared workflow shell should come from `packages/workflow-ui`, with ecosystem-level workspace navigation composed around it rather than recreated by each workflow.

## Visual language

Prefer:

- warm paper/ivory surfaces;
- restrained ink/navy typography;
- serif editorial hierarchy with a clean sans-serif UI face;
- thin rules and document-oriented cards;
- compact status/reference metadata;
- restrained accents for important actions and state.

Avoid glossy gradients, excessive glass effects, generic AI imagery, and unnecessary dashboard density.

## Responsive behavior

Desktop may use a main work area plus evidence/status rails. Mobile should collapse to a single reading/review flow with clear primary actions and accessible source references.
