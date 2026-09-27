# Address and sender-profile follow-up

Status: design considered after the conversational mailing implementation;
profiles, autocomplete, and manual override are **not implemented** by that pass.

## Keep the concepts separate

The account identity, billing address, return address, and recipient address are
not interchangeable. Never derive a return address silently from billing or the
user's account metadata. The currently implemented direct-mail review preserves
separate sender and recipient snapshots and verifies both via the existing Lob
adapter. A reused address from mailing history must still be reviewed.

The next build should add owner-scoped `sender_profiles` with ID, label, entered
address, confirmed normalized address, verification evidence, revision, archive
state, and a single default per owner enforced in the database. Personal and
Business are labels, not different authorization rules. Selecting a default
does not approve it for mailing. Explicitly save a profile; do not save personal
addresses merely because they appeared in a chat or document.

Recipients belong in a separate owner-scoped address book. Team-shared profiles
need explicit membership/role policies and must not expose personal profiles.
Do not introduce team sharing through a nullable owner field.

At preparation, copy both addresses and their verification evidence into the
order. Store source profile ID and revision for provenance, but fulfill using
the approved snapshots, never by following a mutable address-book reference.
Changing a profile cannot change past or already-approved mailings.

## Search is not confirmation

Autocomplete should be debounced and cancellable, starting after a short input
threshold. Selecting a result fills fields; it does not authorize normalization
or sending. Always support manual structured entry, including secondary units
and PO boxes. Preserve country and address kinds even though this first mailing
release supports US addresses only; an international suggestion does not imply
the fulfillment provider can mail there.

Smarty's current US Autocomplete documentation describes a May 2026 version
with a `/v2/lookup` endpoint and separate migration instructions for older
Autocomplete Pro integrations. Use its current contract if chosen, not an old
copied Pro example. Account licensing and cost remain unverified. No account,
subscription, or key was created. [Smarty API reference](https://www.smarty.com/docs/apis/us-autocomplete/reference)

USPS Addresses 3.0 and Google Address Validation remain alternatives to evaluate
for requirements beyond the existing adapter; do not assume geocoding proves
deliverability. The USPS page did not expose its API body to this research tool,
so no claim of verified request/response compatibility is made.
[USPS portal](https://developers.usps.com/addressesv3),
[Google documentation](https://developers.google.com/maps/documentation/address-validation)

For the MVP, retain the already integrated Lob verification adapter and make
autocomplete an independent provider interface. This avoids requiring another
paid service merely to finish verification. Calls should stay behind MailMyPDF's
authenticated Cloudflare backend with server-held credentials. This repository
uses **Supabase**, not the unrelated InsForge project in the task directory;
there is no reason to add an InsForge Edge Function or duplicate backend.

## Verification and overrides

Retain raw input, selected suggestion, normalized address, provider/reference,
verification status, missing-unit information, checked/expiry times, and a hash
of the exact address. Do not log full addresses or provider secrets. Provider
terms and privacy/retention policy determine what raw evidence can be stored.
Cache only within the relevant owner/address boundary; invalidate on edit or
expiry. Strengthen the shared limiter's atomicity before claiming a strict
cross-instance provider-spend ceiling.

Recommended domain states: `unverified`, `verified`, `suggestion_available`,
`missing_unit`, `undeliverable`, `ambiguous`, `provider_unavailable`,
`unsupported`, and `manual_override`. Keep provider status separate from the
decision to permit a mailing. An override must never become `verified`.

Present entered and suggested addresses with changed fields highlighted. Require
the user to accept the exact suggestion, then re-review the resulting order.
Never silently replace either address. New or stale sender profiles need the
same verification discipline; an unusable return address defeats returned mail.

A future “use entered address anyway” path may cover genuinely inconclusive
verification only after the mailing provider's rules are checked. It must
record actor, reason, exact address hash, provider evidence, timestamp, and an
explicit acknowledgement of return/delivery risk. It cannot override a known
undeliverable result, missing required unit, unsupported country/service, or a
carrier rejection. Until that policy and its server-side enforcement are built,
the current review intentionally fails closed.

## Required acceptance cases for the next build

- Ambiguous names require selection; no recipient or sender is inferred.
- One owner's profiles and verification cache never appear to another owner.
- Concurrent default-profile changes leave exactly one default.
- Profile edits invalidate their verification without altering old orders.
- Suggested corrections, missing units, outages, unsupported countries, and
  provider rejection have distinct messages and enforced outcomes.
- Any permitted override is separately audited and re-bound into approval.
- PO-box, military, rural-route, and unit fixtures are tested against the actual
  chosen provider/service contract before advertising support.
