# Immigration-Mail × MailMyPDF Platform

Immigration-Mail is the flagship reference vertical for the MailMyPDF ecosystem. The vertical owns immigration-specific workflows, terminology, UX, prompts, and domain policy. Shared capabilities belong in the Platform and are consumed through stable provider-neutral boundaries.

## Platform capabilities consumed

- Document security and provenance from MailMyPDF Platform.
- Document intelligence from MailMyPDF Platform.
- Structured AI and deterministic preflight from MailMyPDF Platform.
- Multilingual voice from MailMyPDF Platform, with consequential actions approval-gated.
- Evidence, timeline, and deadline primitives from MailMyPDF Platform.
- Identity, usage, entitlements, mailing, tracking, and proof from MailMyPDF.

## Vertical-owned capabilities

1. Immigration document taxonomy and agency classification.
2. Immigration-specific workflows and terminology.
3. Source-backed immigration facts and deadline interpretation.
4. Immigration response objectives, checklists, and domain prompts.
5. Language preferences and immigration-specific UX.
6. Immigration-specific safety policy and review requirements.

## Flagship experience

`Upload / photograph a letter → understand it → identify what is being requested → build a case context → prepare a response → review → deterministic preflight → explicit approval → mail → track → prove → follow up.`

## Safety boundary

The system must never invent facts, deadlines, requirements, or legal conclusions. Extracted facts and AI suggestions remain reviewable and source-linked. Inferred dates are explicitly marked as inferred. Mailing and other consequential actions require explicit user approval.

## Verification

The flagship branch has a repository verification workflow covering `npm ci`, tests, and production build. The latest completed verification run on the pre-documentation commit passed all steps. The documentation-only integration contract update does not alter runtime behavior.
