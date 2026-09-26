# @mailmypdf/signature

Provider-neutral electronic signature capture: request, consent, and
completion state for a signature envelope bound to a specific document hash.

## Boundary

This package owns the envelope state machine and consent/audit contract
only. It does not itself send email, render a signing UI, or store the
signed PDF — those belong to a `SignatureProvider` adapter and
`@mailmypdf/documentStorage`, respectively.

## Status

`implemented`: the contract, state machine, and an in-memory reference
provider are implemented and tested. No real vendor is wired yet, so this is
not yet `production`.

## Production next steps

Implement `SignatureProvider` against a real vendor before this capability
can be marked `production`:

- [Documenso](https://documenso.com) (MIT-licensed, self-hostable) — fits
  this repo's preference for owned infrastructure over vendor lock-in
  (see `@mailmypdf/autonomous-publishing`'s adapter boundary for the same
  pattern).
- [Dropbox Sign API](https://sign.dropbox.com/developers) — faster to
  integrate, hosted, usage-based pricing.

Either adapter must preserve the same invariants the in-memory provider and
`envelope.ts` already enforce: a signer must affirmatively consent
(`intentToSign` + `consentedToElectronicRecords`) before a "signed" event is
accepted, an envelope cannot be re-signed or modified once
completed/declined/voided/expired, and the envelope is bound to one
`documentSha256` for its whole lifecycle.

## Not yet covered

- Confirming the *identity* of a signer beyond their claimed email — that is
  `identityVerification`'s job, not this package's. A workflow that needs
  KYC-grade signing should depend on both capabilities.
- Persisting the final signed-document bytes/hash — a provider adapter
  returns them; storing them is `documentStorage`'s job.
