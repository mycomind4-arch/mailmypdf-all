# Secured Transactions Workflow Family

## Purpose

Contains the 17 domain-specific workflows. Each workflow should remain thin: unique manifest, rules, prompts, authorities, forms, assets, fixtures, and tests, while shared behavior stays in packages.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `secured-transaction-eligibility/` | Secured-Transaction Eligibility: Determine whether the facts describe a legitimate secured transaction and whether the matter can proceed into attachment, perfection, and priority analysis. |
| `name-capacity-resolution/` | Name & Capacity Resolution: Resolve the parties, authoritative names, roles, capacities, ownership relationships, and authority to act without treating formatting differences as separate legal persons. |
| `obligation-value/` | Obligation & Value: Identify and document the real obligation, value given, obligor, secured party, supporting instruments, and evidence needed for attachment analysis. |
| `collateral-ownership-classification/` | Collateral Ownership & Classification: Identify the proposed collateral, determine who has rights in it, classify it for Article 9 purposes, and produce a supportable collateral description. |
| `governing-law-filing-jurisdiction/` | Governing Law & Filing Jurisdiction: Determine debtor location, governing law, applicable filing office, and jurisdiction-specific perfection rules. |
| `pre-filing-lien-priority-search/` | Pre-Filing Lien & Priority Search: Collect and normalize existing UCC records, liens, title interests, and other competing claims before a perfection strategy is chosen. |
| `priority-strategy/` | Priority Strategy: Evaluate available lawful perfection and priority paths against known competing interests and statutory exceptions. |
| `security-agreement-generation/` | Security Agreement Generation: Assemble an authenticated security agreement from verified parties, obligation facts, authority, and a sufficiently specific collateral description. |
| `attachment-certification/` | Attachment Certification: Verify that value, debtor rights in collateral, and an authenticated security agreement or valid alternative support attachment. |
| `perfection-method-selection/` | Perfection Method Selection: Select the lawful perfection method for each collateral class, including filing, possession, control, title notation, or another supported method. |
| `ucc1-preparation-authorization/` | UCC-1 Preparation & Authorization: Prepare an authorized financing statement using the controlling debtor name, secured-party information, collateral indication, jurisdiction rules, and filing-office requirements. |
| `perfection-execution/` | Perfection Execution: Track and evidence completion of the selected perfection acts without treating a prepared document as proof that perfection occurred. |
| `post-perfection-verification/` | Post-Perfection Verification: Verify filing acceptance or other perfection evidence, detect defects, and compare the completed event against the approved perfection plan. |
| `first-priority-determination/` | First-Priority Determination: Analyze the perfected interest against competing claims and applicable statutory priority rules without promising blanket first-lien status. |
| `priority-remediation/` | Priority Remediation: Identify correctable defects or lawful actions that may improve or preserve a secured party's position. |
| `priority-preservation-monitoring/` | Priority Preservation & Monitoring: Monitor continuation windows, debtor changes, collateral changes, new filings, lapse risks, and other events that can affect perfection or priority. |
| `amendment-continuation-assignment-termination/` | Amendment / Continuation / Assignment / Termination: Manage the lifecycle of valid financing statements and secured interests after initial perfection. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.

## Notes

Dependencies among workflows should be explicit in manifests rather than implemented as hidden imports or copied logic.
