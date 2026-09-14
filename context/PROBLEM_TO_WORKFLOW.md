# Problem-led workflow factory

Product direction supplied by the owner on 2026-09-14:
A user describes their actual problem. Agents construct a workflow tailored to
that matter. A reusable workflow without the user's personal data can become a
registry entry that other users may choose. The catalog grows from real needs.

This is a product direction, not implemented behavior or authorization for
automatic publication, deployment, payment, or mailing.

## Proposed implementation boundary

1. Understand the problem, ask for missing consequential facts, and identify
   jurisdiction, desired outcome, urgency, and supported capabilities.
2. Reuse a matching verified template where possible. Otherwise compose a private
   matter plan from approved, versioned steps and contracts. Unsupported capabilities
   become review tasks, not invented automation or dynamically deployed agent code.
3. Let the user review the plan. Execute through the existing ownership, evidence,
   approval, payment, fulfillment, and audit boundaries.
4. Derive a separate template candidate containing field schemas, supported
   conditions, step definitions, validation rules, and synthetic examples. Do not
   copy user values, uploads, prompts, free-text case narratives, or output documents.
5. Check residual identifying details, secrets, supported jurisdictions, duplicate
   templates, safe execution, and document quality. Generalization is a privacy
   task; replacing names alone does not establish anonymization.
6. Test with synthetic scenarios and require review before publishing a versioned
   template. Save private provenance separately from public registry metadata.

## Suggested lifecycle

Private matter plan -> template candidate -> privacy and compatibility review ->
synthetic acceptance tests -> reviewed publication -> observed outcomes/versioning.

The public registry must distinguish reviewed executable templates from draft or
unsupported proposals. Never promise a legal outcome or activate unreviewed local
rules because a model generated them. Favor improving existing templates over
creating hundreds of near-duplicates.

## Dependencies before implementation

Reliable account/matter isolation; shared step contracts; reference workflow
acceptance; stable navigation; an authoritative registry; explicit data-retention
and reuse policy; integration checks that evaluate the final combined application.
