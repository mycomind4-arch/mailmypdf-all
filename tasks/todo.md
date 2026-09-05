# Workflow runtime increment

- [x] Add failing behavior tests for analysis validation and draft readiness.
- [x] Extract SSDI instructions behind an explicit workflow/vertical resolver.
- [x] Wire validation and readiness checks into the existing analysis service.
- [x] Run focused tests, application suite and build; record limitations.

## Verification

- Initial runtime test failed before implementation (module absent).
- Focused AI/packet/SSDI/runtime tests: 36 passed; runtime coverage subsequently
  expanded to 10 passing tests, including real service refusal paths.
- All TypeScript tests: 50 passed.
- JavaScript and TypeScript app suite: 98 passed.
- Production build passes; prior checkout import failure was repaired and the
  generated database types now include the seven entitlement/pricing tables.
- No live document, AI provider, payment, or mailing requests used for verification.

## Next work and security constraints

- Repair the baseline checkout imports and regenerate database types from the
  verified schema before claiming the phase 3 integration is buildable.
- Persist and validate user-supplied SSDI facts before using them in drafting.
- Verify workflow-specific notice suitability and appeal-stage gates. The first
  increment's schema checks structure, not factual truth or legal correctness;
  workflow prompt instructions are not an authorization/security boundary.
- Verify concurrent attachment changes against immutable draft/approval provenance.
- Test the complete SSDI path with synthetic documents, including owner isolation,
  disclosure consent, quarantine, retention and exact approved-packet fulfillment.
- Keep document custody and authorization in the shared secure v2 core. Do not
  route sensitive government documents through legacy v1 integrations.
- Only SSDI/appeal-mail has an enabled analysis/draft runtime in this increment;
  other workflow/vertical pairs explicitly fail instead of using generic prompts.
- A future migration must move assignment creation plus its audit event into one
  transaction and add an atomic free-workflow redemption ledger.
- The approval RPC is now service-role-only and the server rebuilds the packet;
  production deployment must apply the migration as one ordered set. No live
  Supabase, model, Stripe, or mailing call has been made here.
