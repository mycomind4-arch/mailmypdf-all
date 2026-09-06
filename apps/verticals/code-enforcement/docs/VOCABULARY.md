# Vocabulary: reconciling FairProcessMaps' checkpoint statuses with this vertical's claim labels

Both source docs gesture at "one shared vocabulary" without ever writing it
down. This is that write-down — done before any integration code, per the
decision to sequence it first.

## The two vocabularies, verbatim

**FairProcessMaps** (`docs/policy-packs.md` in the FairProcessMaps repo) —
the output of a deterministic, non-LLM rule evaluator, one value per
procedural checkpoint:

| Status | Meaning |
|---|---|
| `Observed` | The condition the checkpoint describes appears in the case file. |
| `NotLocated` | An expected record was not found in the evidence we have. **Not** proof it doesn't exist. |
| `InsufficientEvidence` | Required dates or documents are missing; the checkpoint can't be evaluated. |
| `AwaitingTrigger` | The event that starts the clock hasn't been established. |
| `Satisfied` | The records meet the checkpoint. |

**Code Enforcement** (this vertical's `README.md`) — the provenance label
required on anything the case-grounded AI assistant says:

| Label | Meaning |
|---|---|
| `Fact` | Directly supported by evidence. |
| `Inference` | Reasoned from evidence but not directly stated. |
| `Unknown` | Evidence is missing. |
| `Rule` | Supplied by a jurisdiction policy source. |
| `Recommendation` | Proposed next step, requiring user approval. |

## Why these don't merge into one list

They answer different questions, for different consumers:

- **Status** is the answer to *"does the record satisfy this specific,
  pre-written checkpoint?"* — produced deterministically by
  `evaluate.ts` against a policy pack, with no model in the loop. It is
  displayed as-is in the Procedural Integrity Report (a table, cited,
  reproducible-by-hash). It never needs a claim-type label there — the report
  isn't making a conversational claim, it's printing an evaluator's output.
- **Claim label** is the answer to *"what kind of thing is the assistant
  saying, right now, in this sentence?"* — required on every sentence the
  case-grounded assistant produces, whether or not that sentence has
  anything to do with a policy checkpoint. "The notice lists the mailing
  address as 123 Main St" is a `Fact` with nothing to do with any Status.

Treating these as the same axis and trying to pick one label per Status
would be a category error — it would also throw away exactly the nuance
both docs were written to protect (see next section).

**The one place they actually meet:** whenever the assistant describes a
checkpoint's Status in conversation, it must express that Status using a
claim label, and it must not smuggle certainty across categories in the
process — e.g. saying `NotLocated` as if it were a `Fact` that nothing was
sent. That crosswalk is the actual integration surface, and it's the part
that was previously unwritten.

## The crosswalk

A checkpoint's Status is not one claim — it's the output of applying a
`Rule` to some `Fact`s (or `Unknown`s). The assistant should decompose it
into at least two labeled sentences, not compress it into one.

| Status | Required decomposition | Never say |
|---|---|---|
| `Satisfied` | `Fact` (what the record shows) + `Rule` (the requirement it meets, cited) | Don't imply the county did something praiseworthy — just state the two facts. |
| `Observed` | `Fact` only, describing exactly what was found. | Don't upgrade an Observed condition into an Inference of compliance or violation in the same breath — that's a separate, separately-labeled `Inference` if made at all. |
| `NotLocated` | `Unknown` — "no record of X was found in the case file" | Never phrase as `Fact` that X didn't happen. Never say "no notice was sent"; say "no notice record is in the file." |
| `InsufficientEvidence` | `Unknown` — name the specific missing date/document | Never guess at the missing value, even as a labeled `Inference` — the checkpoint doc says outright the checkpoint "can't be evaluated," not "can be estimated." |
| `AwaitingTrigger` | `Unknown`, phrased distinctly from `InsufficientEvidence` — "the triggering event isn't established yet, so this checkpoint doesn't apply yet" | Don't collapse into `InsufficientEvidence` prose; a reader needs to know the clock hasn't started, not that data is merely missing. |

A `Recommendation` may follow from any Status (e.g. `NotLocated` on a
service-proof checkpoint → "consider requesting proof of service from the
agency") but is always its own separately-labeled, separately-approved
sentence — never fused into the Status description itself.

An `Inference` is where the assistant reasons across more than one
checkpoint or fact ("the short gap between notice and hearing, combined
with no continuance on record, may not meet the statutory minimum"). This
is explicitly not the checkpoint's Status — the Status is deterministic
evaluator output; the moment a human-legible narrative synthesizes several
of them, that synthesis is an `Inference` and must be labeled as one, with
the underlying Statuses still individually inspectable.

## Borrowed discipline: extend the neutrality test to the assistant

FairProcessMaps enforces this in code, not just prose: a test fails the
build if any evaluator emits "violation," "failed to," "unlawful," or
similar (`src/lib/policy/__tests__/evaluate.test.ts`). This vertical's
README states the same intent in prose ("does not decide that a violation
is legally invalid") but doesn't yet enforce it.

**Requirement for this vertical:** the same neutrality check must run
against anything the case-grounded assistant generates — `Inference` and
`Recommendation` text especially, since those are the categories where an
LLM is most likely to reach for a legal conclusion it isn't qualified to
make. Implement this as an automated test once the assistant exists, the
same way FairProcessMaps did — don't rely on the system prompt alone.

## Activation gate carries over unchanged

FairProcessMaps' `legal_review_required` / `active` distinction on policy
packs applies here without modification: any `Rule`-labeled statement this
assistant makes must trace to a pack that has cleared that gate, or the
statement must say so explicitly (e.g. "per an unreviewed draft rule").
This is the same boundary the integration doc already names
("Jurisdictional rules must be reviewed before activation") — this section
just ties it to the specific label (`Rule`) that carries the obligation.

## The two questions this doc used to leave open

Both are now decided in [`FAIRPROCESSMAPS_INTEGRATION.md`](FAIRPROCESSMAPS_INTEGRATION.md#two-decisions-this-doc-previously-left-open):
the Case Assistant is ported from FairProcessMaps and relabeled into this
vocabulary via the crosswalk above, not rebuilt independently; mailing
routes through MailMyPDF's own pipeline, not FairProcessMaps' Lob
integration. This doc still only fixes the words — the crosswalk above is
what the ported assistant must actually implement.

Implementers should treat both the Status table and the crosswalk table
above as load-bearing once code starts consuming either vocabulary —
changing either requires updating this file in the same change.
