/**
 * Biometrics Content — SEO and landing page content for USCIS biometrics scheduling
 */

export interface BiometricsContentPage {
  slug: string;
  title: string;
  description: string;
  h1: string;
  canonical: string;
  body: string;
  faq: { question: string; answer: string }[];
}

export const BIOMETRICS_CONTENT_PAGES: BiometricsContentPage[] = [
  {
    slug: 'uscis-biometrics-reschedule',
    title: 'USCIS Biometrics Reschedule — How to Reschedule Your ASC Appointment | Immigration Mail',
    description: 'Need to reschedule your USCIS biometrics appointment? We help you prepare and mail a biometrics reschedule request letter with tracking and proof of delivery.',
    h1: 'Reschedule Your USCIS Biometrics Appointment',
    canonical: 'https://immigrationmail.com/biometrics/uscis-biometrics-reschedule',
    body: `## Can't Make Your Biometrics Appointment?

If you cannot attend your scheduled USCIS biometrics appointment, you need to act quickly. USCIS allows you to reschedule your appointment, but you must submit the request before the appointment date.

## How to Reschedule

1. **Submit a reschedule request letter** to USCIS explaining why you cannot attend
2. **Include your receipt number** and appointment details
3. **Provide supporting documentation** for the reason (medical, travel, emergency)
4. **Mail the request** before your appointment date

## What You Need

- Biometrics appointment notice (Form I-797C)
- Receipt number
- Reason for rescheduling
- Supporting evidence (medical records, travel documents, etc.)

## How We Help

We analyze your situation, draft a reschedule request letter with the correct USCIS address, and mail it with tracking and proof of delivery. We also verify that your appointment date allows sufficient time for the reschedule request to be processed.

## Important

USCIS may not confirm receipt of your reschedule request. If you do not receive a new appointment notice within a reasonable time, follow up with the USCIS Contact Center.`,
    faq: [
      { question: 'How far in advance do I need to request a biometrics reschedule?', answer: 'Submit your reschedule request as soon as you know you cannot attend. USCIS recommends requesting at least 7-14 days before the appointment, but there is no strict deadline — submit it before the appointment date.' },
      { question: 'What happens if I miss my biometrics appointment without rescheduling?', answer: 'Missing a biometrics appointment without prior reschedule may result in your application being deemed abandoned and denied. Contact USCIS immediately if you missed your appointment.' },
      { question: 'Can I walk in to a different ASC location?', answer: 'Some ASCs accept walk-ins, but this is not guaranteed. It is better to submit a formal transfer request or reschedule through USCIS.' },
      { question: 'How many times can I reschedule biometrics?', answer: 'USCIS does not specify a limit, but multiple reschedule requests may delay your application and raise concerns. Reschedule only when necessary.' },
    ],
  },
  {
    slug: 'missed-biometrics-appointment',
    title: 'Missed Biometrics Appointment — What to Do After Missing USCIS ASC | Immigration Mail',
    description: 'Missed your USCIS biometrics appointment? We help you prepare a remedy letter explaining the missed appointment and requesting a new one with tracking and proof.',
    h1: 'Missed Your Biometrics Appointment?',
    canonical: 'https://immigrationmail.com/biometrics/missed-biometrics-appointment',
    body: `## Missing a Biometrics Appointment Is Serious

Missing your USCIS biometrics appointment can result in your application being deemed abandoned and denied. You must act immediately to remedy the situation.

## What to Do If You Missed Your Appointment

1. **Contact USCIS immediately** — Call the USCIS Contact Center at 1-800-375-5283
2. **Prepare a written explanation** — Explain why you missed the appointment
3. **Request a new appointment** — Ask USCIS to schedule a new biometrics appointment
4. **Provide supporting evidence** — Include documentation of the emergency or conflict
5. **Mail the request** — Send the letter with tracking and proof of delivery

## Consequences by Form Type

- **I-485, N-400, I-751**: Missing biometrics may result in application denial
- **I-90, I-765**: May need to refile and pay fees again
- **I-130, I-129**: Processing delays; petition may continue but beneficiary biometrics are delayed

## How We Help

We analyze your missed appointment situation, draft a remedy letter with the correct USCIS address, identify the right supporting evidence, and mail it with tracking and proof of delivery.`,
    faq: [
      { question: 'Will USCIS deny my application if I missed my biometrics appointment?', answer: 'Not immediately, but if you do not act quickly to request a new appointment, USCIS may deem your application abandoned. The consequences vary by form type — some applications are at higher risk of denial than others.' },
      { question: 'Can I walk in to the ASC after missing my appointment?', answer: 'Some ASCs may accept walk-ins, but this is not guaranteed. The safest approach is to submit a written request for a new appointment with supporting documentation.' },
      { question: 'What evidence should I include for a missed appointment?', answer: 'Include any documentation of the emergency or circumstance that prevented you from attending — medical records, travel documents, emergency notifications, or other proof of the conflict.' },
      { question: 'How long does USCIS take to reschedule a missed biometrics appointment?', answer: 'USCIS typically sends a new appointment notice within 2-6 weeks after receiving your request, but timing varies by service center and case load.' },
    ],
  },
  {
    slug: 'asc-location-transfer',
    title: 'ASC Location Transfer — Request a Different Biometrics Location | Immigration Mail',
    description: 'Your ASC is too far or inaccessible? We help you prepare a biometrics location transfer request to USCIS with tracking and proof of delivery.',
    h1: 'Request an ASC Location Transfer',
    canonical: 'https://immigrationmail.com/biometrics/asc-location-transfer',
    body: `## Need a Different ASC Location?

If your assigned Application Support Center (ASC) is too far away, inaccessible, or has closed, you can request a transfer to a different location.

## When to Request a Transfer

- The assigned ASC is too far from your residence
- You have moved since receiving the appointment notice
- The ASC is inaccessible due to a disability and ADA accommodations are insufficient
- The ASC has closed or relocated

## What You Need

- Biometrics appointment notice (Form I-797C)
- Evidence of the distance, move, or accessibility issue
- Preferred alternative ASC location (if known)

## How We Help

We analyze your situation, identify the correct USCIS office for the transfer request, draft a transfer request letter with supporting arguments, and mail it with tracking and proof of delivery.`,
    faq: [
      { question: 'How do I find the nearest ASC location?', answer: 'USCIS maintains a list of ASC locations on their website. You can search by ZIP code to find the nearest center. We help identify alternative locations during the transfer request process.' },
      { question: 'Can I change my ASC location after moving?', answer: 'Yes, if you have moved, you should update your address with USCIS (Form AR-11) and request a biometrics appointment at a closer ASC location.' },
      { question: 'Will transferring my ASC location delay my application?', answer: 'A transfer may cause a short delay while USCIS reschedules the appointment, but the overall impact is typically minimal compared to attending an inaccessible ASC.' },
    ],
  },
];

export function getBiometricsContent(slug: string): BiometricsContentPage | undefined {
  return BIOMETRICS_CONTENT_PAGES.find(p => p.slug === slug);
}
