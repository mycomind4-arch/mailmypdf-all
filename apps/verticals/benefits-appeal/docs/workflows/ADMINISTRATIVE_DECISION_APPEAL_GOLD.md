# Administrative Decision Appeal — Gold Standard

## Public surface
- Authority-first landing page at `/workflows/administrative-decision-appeal`
- Transparent workflow-specific pricing
- Procedure warnings and human approval boundaries

## AI pipeline
1. Classify and extract the source decision.
2. Identify issuer and jurisdiction.
3. Resolve authoritative sources before procedural conclusions.
4. Analyze deadline, evidence, contradictions, and timeline.
5. Draft with Gemini using only supported facts and authority.
6. Independently validate with Gemini.
7. Require human approval.
8. Price the physical packet from approved response/supporting sheets and mailing method.
9. Create Stripe checkout.
10. Generate the deterministic final-response PDF and fulfill through MailMyPDF.
11. Record provider-backed mailing/proof data.

## Authority safety
The workflow never invents deadlines, recipients, forms, filing destinations, hearing rights, exhaustion requirements, facts, or outcomes. Administrative procedure is treated as jurisdiction- and agency-specific unless supported by the notice and current authoritative sources.

## Pricing
Preparation: $32.99. Includes 4 response sheets. Additional response sheets: $0.45 each. Supporting-document sheets: $0.25 each. Standard, Certified, Certified + Return Receipt, and Registered options are priced separately. A $2.50 packet surcharge applies when the physical packet exceeds the configured envelope threshold.

## Certification
`tests/administrative-decision-appeal-gold.test.ts` is the Gold contract test. CI is the final certification gate.
