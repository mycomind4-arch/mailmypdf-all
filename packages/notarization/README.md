# @mailmypdf/notarization

Provider-neutral remote online notarization (RON) session state. A document
can only enter a notarization session bound to an **already-verified**
signer identity (`@mailmypdf/identity-verification`'s `VerifiedIdentity`) —
this package never performs identity verification itself, and structurally
cannot create a session without proof that verification already happened.

## Boundary

Owns the notarization state machine and attestation/journal-entry contract
only. Does not perform identity verification (`@mailmypdf/identity-verification`),
signature capture (`@mailmypdf/signature`), or document storage.

## Status

`implemented`: contract, state machine, and an in-memory reference provider
are implemented and tested. No real RON vendor is wired yet. Marked
**consequential** — a workflow using this capability must reach it only
through `humanReview`/`blockingGate`, same as `mailing`/`payment`.

## Production next steps

Implement `NotaryProvider` against a real vendor before this capability can
be marked `production`:

- [Proof.com](https://www.proof.com) (formerly Notarize) — RON + e-signature
  + identity verification in one network; industry leader. 49 states + DC
  now operate under permanent RON legislation (as of 2026).

## Recordkeeping

`NotaryAttestation.journalEntryId` is required on every attestation — most
US states legally require a notary to keep a journal of every notarization
performed. This package only carries the id; the journal itself is the RON
vendor's or the notary's responsibility.
