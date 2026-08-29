# Code Enforcement Workflow Catalog

## Purpose

This catalog defines the initial Code Enforcement workflow ecosystem. Workflows are intentionally narrow, high-intent entry points that share the same underlying case, evidence, timeline, strategy, drafting, authorization, fulfillment, tracking, and proof infrastructure.

The catalog is organized by priority and is the planning source for workflow implementation, SEO/content generation, pricing, testing, and workflow-factory coverage.

## Workflow Architecture

Every workflow should reuse the Gold-standard pipeline where applicable:

**Intake → classify → extract → evidence → timeline → applicable rules → identify weaknesses/opportunities → strategy → draft → validate → review → authorize → send → track → proof**

Individual workflows supply their own trigger, user intent, required/optional evidence, jurisdiction requirements, deadline rules, strategic objectives, document templates, validation rules, output, SEO metadata, pricing, FAQs, and related workflows.

## Tier 1 — Core Money Workflows

1. Respond to Code Violation Notice
2. Respond to Notice of Violation
3. Respond to Property Maintenance Violation
4. Respond to Building Code Violation
5. Respond to Zoning Violation
6. Respond to Unpermitted Construction Notice
7. Request Code Enforcement Extension
8. Request Additional Time to Correct Violations
9. Submit Proof of Correction
10. Request Reinspection
11. Dispute Code Enforcement Citation
12. Appeal Code Enforcement Decision
13. Request Administrative Hearing
14. Respond to Abatement Notice
15. Dispute Code Enforcement Fine/Penalty

## Tier 2 — High-Value Supporting Workflows

16. Request Code Enforcement Records
17. Request Inspection Records
18. Request Code Enforcement Photos
19. Request Property Violation History
20. Request Permit Records
21. Request Code Enforcement Case Status
22. Request Copy of Violation Notice
23. Challenge Incorrect Property Information
24. Challenge Incorrect Violation Information
25. Respond to Failed Reinspection
26. Request Compliance Confirmation
27. Request Case Closure
28. Request Reduction of Code Enforcement Penalty
29. Request Payment Plan for Code Enforcement Fine
30. Request Voluntary Compliance Agreement

## Tier 3 — Specialized Property Situations

31. Respond to Nuisance Property Notice
32. Respond to Junk/Trash Violation
33. Respond to Exterior Maintenance Violation
34. Respond to Overgrown Vegetation Notice
35. Respond to Unsafe Structure Notice
36. Respond to Vacant Property Violation
37. Respond to Illegal Occupancy Notice
38. Respond to Illegal Rental/Use Notice
39. Respond to Parking Violation
40. Respond to Signage Violation
41. Respond to Fence/Setback Violation
42. Respond to Noise/Nuisance Violation
43. Respond to Short-Term Rental Violation
44. Respond to Zoning Use Violation
45. Respond to Building Permit Violation

## Tier 4 — Escalation Workflows

46. Request Code Enforcement Supervisor Review
47. Request Administrative Review
48. Request Hearing Continuance
49. Submit Supplemental Evidence
50. Submit Witness/Contractor Statement
51. Challenge Inspection Findings
52. Challenge Reinspection Findings
53. Challenge Abatement Action
54. Challenge Administrative Citation
55. Challenge Property Lien Related to Enforcement
56. Respond to Notice of Intent to Abate
57. Respond to Emergency Abatement Notice
58. Request Abatement Hearing
59. Appeal Administrative Citation
60. Appeal Administrative Decision

## First Workflow Family to Build

Build the complete lifecycle before expanding broadly:

**Notice → Analyze → Respond → Extend → Cure → Reinspect → Close**

This family should establish the reusable workflow-factory patterns for the remaining catalog.

## Workflow Design Rules

- One workflow should represent one clear user intent.
- Workflows should be composable so one case can spawn another workflow without restarting intake.
- Preserve case/evidence context between related workflows.
- Never invent facts, evidence, deadlines, rules, or agency actions.
- Distinguish verified facts, user assertions, inferred information, missing information, and unresolved conflicts.
- Surface favorable evidence and weaknesses in the enforcement record when supported by evidence.
- Provide actionable next steps rather than merely generating correspondence.
- Consequential communications require explicit human authorization before fulfillment.
- MailMyPDF is the physical-mail execution and proof layer where applicable.

## Planned Workflow Metadata

Each implemented workflow should have a machine-readable definition containing at least:

- `id`
- `slug`
- `name`
- `tier`
- `category`
- `intent`
- `trigger`
- `requiredEvidence`
- `optionalEvidence`
- `deadlineInputs`
- `jurisdictionInputs`
- `analysisCapabilities`
- `strategyOptions`
- `documentOutputs`
- `validationRules`
- `fulfillmentOptions`
- `seo`
- `pricing`
- `relatedWorkflows`
- `status`

## Status Convention

Use these statuses during implementation:

- `planned` — cataloged but not implemented
- `scaffolded` — workflow definition exists
- `functional` — core workflow executes end-to-end
- `gold` — passes the full Gold-standard workflow contract
- `production` — deployed, monitored, and operational

The catalog is intentionally broader than the first implementation milestone. Do not mark a workflow complete merely because a landing page or letter template exists; the workflow itself must execute the required case/evidence/validation/authorization/fulfillment path.
