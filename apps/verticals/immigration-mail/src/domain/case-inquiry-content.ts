/**
 * Case Inquiry Content — SEO and landing page content for USCIS case inquiries
 */

export interface CaseInquiryContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const CASE_INQUIRY_CONTENT_PAGES: CaseInquiryContentPage[] = [
  {
    slug: 'uscis-case-inquiry',
    title: 'USCIS Case Inquiry — Check Case Status Outside Processing Time | Immigration Mail',
    description: 'Your immigration case is taking too long? We help you prepare a USCIS case inquiry, service request, or expedite request and mail it with tracking and proof.',
    h1: 'Submit a USCIS Case Inquiry',
    canonical: 'https://immigrationmail.com/case-inquiry/uscis-case-inquiry',
    body: `## Is Your Immigration Case Taking Too Long?

If your case has been pending longer than the normal processing time, you can submit a case inquiry to USCIS. We help you determine whether your case is outside normal processing times, prepare the right type of inquiry, and mail it with tracking and proof of delivery.

## Types of Case Inquiries

- **Service Request**: For cases outside normal processing time. Ask USCIS for a status update.
- **Expedite Request**: For urgent cases — severe financial loss, humanitarian reasons, USCIS error, or nonprofit/government interest.
- **Case Status Inquiry**: General inquiry about your case status when you have not received communication.
- **Congressional Inquiry**: Through your representative or senator — for cases where standard inquiries have not resolved the issue.

## What You Need

- Receipt number (from your I-797C notice)
- Form type (e.g., I-485, I-130, N-400)
- Filing date
- Any correspondence from USCIS
- Supporting evidence (for expedite requests)

## How We Help

1. Analyze your case delay and determine the inquiry type
2. Verify whether your case is outside normal processing time
3. Identify the correct service center and address
4. Draft your inquiry letter with key arguments
5. Mail it with tracking and proof of delivery

## When to Submit an Inquiry

- Your case has been pending longer than the published processing time
- You have not received any communication from USCIS
- Your circumstances have changed and you need expedition
- A deadline (like aging out) is approaching
`,
    faq: [
      { question: 'How long does USCIS take to respond to a case inquiry?', answer: 'USCIS typically responds to case inquiries within 30–45 days. If you do not receive a response, you may need to escalate to a congressional inquiry.' },
      { question: 'What is the difference between a service request and an expedite request?', answer: 'A service request asks for a status update on a case outside normal processing time. An expedite request asks USCIS to process your case faster based on qualifying criteria like severe financial loss or urgent humanitarian need.' },
      { question: 'Can I submit a case inquiry online?', answer: 'USCIS offers e-Request for certain case types. However, some cases require a written inquiry letter. We help you prepare and mail a written inquiry when online submission is not available or insufficient.' },
      { question: 'What if my case is still within normal processing time?', answer: 'If your case is within normal processing time, USCIS may not act on your inquiry. We help you verify processing times before filing and can recommend whether waiting or filing is appropriate.' },
    ],
  },
  {
    slug: 'expedite-request',
    title: 'USCIS Expedite Request — Expedite Your Immigration Case | Immigration Mail',
    description: 'Need to expedite your immigration case? We help you prepare a USCIS expedite request letter with qualifying criteria and supporting evidence.',
    h1: 'USCIS Expedite Request',
    canonical: 'https://immigrationmail.com/case-inquiry/expedite-request',
    body: `## What Is a USCIS Expedite Request?

An expedite request asks USCIS to process your case faster than normal. USCIS grants expedite requests only for qualifying criteria.

## Qualifying Criteria

USCIS may expedite a case for:

- **Severe financial loss** to the applicant or employer
- **Urgent humanitarian reasons** (medical, family, or other hardship)
- **USCIS error** that caused the delay
- **Nonprofit or government interest**
- **U.S. government national interest**
- **Defense or national security**

## What You Need

- Documentation supporting your expedite criteria
- Evidence of severe financial loss, humanitarian need, or USCIS error
- Receipt number and case details
- Cover letter explaining the urgency

## How We Help

We analyze your situation, identify which qualifying criteria apply, draft a compelling expedite request letter, and mail it with supporting documentation and tracking.

## Important

Expedite requests are not guaranteed. USCIS reviews each request individually and may deny it. If your expedite request is denied, you can consider a congressional inquiry.`,
    faq: [
      { question: 'How long does USCIS take to respond to an expedite request?', answer: 'USCIS typically responds to expedite requests within 5–15 days. The response time depends on the service center and the urgency of the request.' },
      { question: 'What happens if my expedite request is denied?', answer: 'If your expedite request is denied, your case continues under normal processing. You can submit another expedite request with new evidence or consider a congressional inquiry.' },
      { question: 'Can I expedite any form type?', answer: 'Most form types can be expedited, but some have specific expedite criteria. We help you determine whether your form type qualifies.' },
    ],
  },
  {
    slug: 'service-request',
    title: 'USCIS Service Request — Case Outside Processing Time | Immigration Mail',
    description: 'Your case is outside normal processing time? Prepare and mail a USCIS service request inquiry with tracking and proof.',
    h1: 'USCIS Service Request',
    canonical: 'https://immigrationmail.com/case-inquiry/service-request',
    body: `## What Is a USCIS Service Request?

A service request is an inquiry submitted when your case has been pending longer than the normal processing time published by USCIS. It asks USCIS to review your case and provide a status update.

## When to File

- Your case has been pending longer than the published processing time
- You have not received any communication from USCIS
- Your case status online shows "Case Was Received" but no further updates

## How We Help

1. Verify your case is actually outside normal processing time
2. Identify the correct service center
3. Draft a service request inquiry letter
4. Mail it with tracking and proof of delivery
5. Provide escalation guidance if USCIS does not respond

## What You Need

- Receipt number (I-797C)
- Form type
- Filing date
- Any prior correspondence from USCIS

## After You File

USCIS typically responds to service requests within 30–45 days. If you do not receive a response, consider escalating to a congressional inquiry through your representative.`,
    faq: [
      { question: 'How do I know if my case is outside normal processing time?', answer: 'USCIS publishes processing times on their website for each form type and service center. Compare your filing date to the published processing time. We help you verify this automatically.' },
      { question: 'What is the difference between e-Request and a written service request?', answer: 'e-Request is USCIS\'s online system for certain case types. A written service request letter can be used when e-Request is not available or when you want to include detailed supporting documentation.' },
      { question: 'Can I submit a service request if my case is still within processing time?', answer: 'You can, but USCIS may not act on it. It is generally better to wait until your case is outside the published processing time before submitting a service request.' },
    ],
  },
];

export function getCaseInquiryContent(slug: string): CaseInquiryContentPage | undefined {
  return CASE_INQUIRY_CONTENT_PAGES.find(p => p.slug === slug);
}
