# @mailmypdf/efiling

Provider-neutral direct electronic filing submission to a court or agency —
an alternative fulfillment path to `@mailmypdf/mailing-client`'s physical
mail, for jurisdictions/workflows where e-filing is required, available, or
preferred.

## Boundary

Owns the filing-submission state machine only. Does not assemble the packet
(`packetAssembly`), does not decide whether a workflow may file without
review (`approval`/`humanReview`/`blockingGate` remain the gates), and does
not itself talk to any court or agency system.

## Status

`implemented`: contract, state machine, and an in-memory reference provider
are implemented and tested, same as the other capabilities in this batch. No
real electronic filing service provider (EFSP) is wired, so this is not yet
`production` — and reaching `production` here is a bigger lift than the
others (see below): it needs an EFSP partnership, not just a vendor API key.

## Production next steps

This is **not** a single vendor integration the way signature/identity/RON
are. Real e-filing generally requires becoming (or partnering with) a
certified EFSP:

- **Courts**: [Tyler Technologies Odyssey File & Serve](https://www.tylertech.com/products/enterprise-justice/efile-serve)
  is the ECF-4-standard backbone many state courts already run on (44 partner
  integrations). Realistically this means partnering with an existing EFSP
  rather than building a direct court integration from scratch.
- **UCC/agency filings**: `jurisdiction.kind: "agency"` already covers this
  shape (e.g. `{ kind: "agency", name: "California Secretary of State",
  region: "CA" }`). [Wolters Kluwer Lien Solutions / CT Corporation](https://www.wolterskluwer.com/en/solutions/lien-solutions/ucc-filing-and-public-records-search/lien-filings)
  offers an enterprise UCC e-filing service; some state Secretaries of State
  also expose their own direct e-filing, coverage varies by state and there
  is no single national API. `@mailmypdf/registry-adapters`' `ucc-search`
  module is the complementary *pre-filing* search/due-diligence step (does a
  competing lien already exist) — it is a read-only search framework and
  deliberately does not grow a filing-submission capability of its own; a
  workflow doing a UCC filing should depend on both `research`
  (`ucc-search`) and `efiling`.

Every `FilingProvider` adapter must preserve the invariant `submission.ts`
already enforces: a rejected or voided submission is terminal — a correction
is a new submission, never a mutation of the rejected one, so the historical
record of what was actually filed and what happened to it stays exact.
