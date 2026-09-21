# Legacy MailMyPDF extraction audit

Date: 2026-09-21

Compared:

- `/Users/macdizzle/dev/mailmypdf-all/apps/mailmypdf`
- `/Users/macdizzle/dev/mailmypdf-all-main/mailmypdf`

## Decision

No bulk copy is appropriate. The `apps/mailmypdf` tree is an older snapshot and
the current `mailmypdf` tree already contains the later security, navigation,
runtime, mailing, notification, and Studio work. Copying the older tree over the
current tree would risk replacing server-side authorization and reintroducing
the older adapter structure.

## Already represented in the current app

- `src/lib/cp2000/*` is represented by the current notice workflow runtime,
  domain packs, gold content, and workflow registry.
- `workflow-seo-catalog-notice.ts` is superseded by the current authored SEO
  entry catalog in `src/lib/workflow-seo-entries`.
- `court-summons-workflow.tsx` is an older component wired to the legacy notice
  client. The current app has the workflow registry and runtime boundary; the
  old component should not be copied without a deliberate execution-contract
  review.
- `cp2000-workflow.tsx` is an older UI implementation. The current app already
  has the CP2000 workflow runtime and authenticated workflow route. Copying this
  component would create a second client-side execution path.
- `studio-framing.ts` is an iframe exception for a local port. The current app
  intentionally sends `X-Frame-Options: DENY`, and Studio is being separated into
  its own app. It should not be restored.
- Older package dependencies such as the legacy workflow catalog, vertical
  adapters, and React Flow dependency are not missing; they were intentionally
  removed or replaced in the current architecture.

## Items worth preserving as reference only

- The source tree's `SECURITY.md`, audit documents, and workflow authority
  documents may contain historical requirements. The current versions were
  compared by path and should remain canonical; older copies should only be
  consulted for a specific missing requirement.
- The source tree's tests are useful as regression references where the current
  app has an equivalent implementation. They should be ported as focused tests,
  not copied wholesale, because many assert the old route and package layout.

## Verification evidence

- The current app contains `src/routes/_authenticated.admin.tsx` and
  `src/routes/_authenticated/studio.tsx`, while the source snapshot does not.
- The current app contains the server-side Studio access boundary under
  `src/studio/access` and the Studio API routes under `src/routes/api.studio.*`.
- The current app contains the workflow runtime bridge, mailing record,
  notification delivery, publication, and authenticated workflow modules that
  are absent from the older snapshot.
- The current app build passed during this migration session. The remaining
  typecheck failures are existing route-generation and unrelated type errors.

## Follow-up

Keep the source tree as a read-only recovery reference until the vertical
migration is complete. If a specific feature is later found to be absent, port
its behavior into the current package or route contract with a focused test and
security review.
