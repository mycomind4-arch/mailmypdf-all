# @mailmypdf/identity-verification

Provider-neutral identity *proofing*: confirming a matter party is who they
claim to be. This is distinct from platform auth/ownership (session identity,
"is this user logged in and do they own this matter") — that boundary lives
elsewhere; see the `identity` capability's own package for the open question
of which package should canonically own it.

## Boundary

This package owns the verification-session state machine and check-result
contract only. It does not itself scan a document, run a liveness check, or
query an identity database — those belong to a `VerificationProvider`
adapter.

## Status

`implemented`: the contract, state machine, and an in-memory reference
provider are implemented and tested. No real vendor is wired yet.

## Production next steps

Implement `VerificationProvider` against a real vendor before this
capability can be marked `production`:

- [Stripe Identity](https://stripe.com/identity) — natural fit since
  `@mailmypdf/payment-fulfillment` is already on Stripe; ~$1.50/verification,
  first 50 free.
- [Persona](https://withpersona.com) — best developer experience if more
  configurable verification flows are needed later.

Either adapter must preserve the invariants `session.ts` already enforces: a
session only reaches `verified` once every *required* method has
independently passed, a failed required check fails the session immediately
(no in-place retry — create a new session), and `verifiedIdentity` is only
populated once real verification succeeds.

## Composing with other capabilities

A workflow requiring a notarized signature should depend on both this
capability and `notarization` (a notary must confirm identity before
notarizing). A workflow only requiring a captured signature, with no identity
proofing requirement, should depend on `signature` alone.
