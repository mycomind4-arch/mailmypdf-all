import { createFileRoute } from '@tanstack/react-router'
import { SectionLandingPage, type SectionLandingConfig } from '@mailmypdf/design-system/public'

const config: SectionLandingConfig = {
  id: 'code-enforcement',
  name: 'Code Enforcement',
  path: '',
  tone: 'dark',
  seoTitle: 'Code Enforcement Workflows | MailMyPDF',
  seoDescription: 'Turn a code enforcement notice into documented, reviewable action.',
  eyebrow: 'Code Enforcement · Respond with a record',
  heroTitle: 'Turn a code enforcement notice into documented action.',
  heroDescription: 'Start from the notice, inspection request, violation, citation, or abatement action. Organize the facts and evidence, prepare a reviewable response, and keep the mailing and proof record together.',
  heroImage: '/hero.svg',
  introTitle: 'Start with the action the agency took.',
  introText: 'Code Enforcement is organized around the exact notice or procedural step in front of you rather than one generic response form.',
  trustLead: 'Notice-first workflow',
  topics: [
    { title: 'Notices and violations', text: 'Respond to a violation notice with the facts, dates, and supporting record organized.' },
    { title: 'Extensions and compliance', text: 'Prepare a documented request for additional correction time or a compliance response.' },
    { title: 'Inspections and findings', text: 'Challenge disputed inspection findings with a clear, reviewable matter record.' },
    { title: 'Hearings and closure', text: 'Prepare an administrative hearing request or document the basis for case closure.' },
  ],
  featured: [
    { slug: 'respond-to-code-violation-notice', title: 'Respond to a Code Violation Notice', description: 'Organize the notice, issues, facts, and response record.' },
    { slug: 'request-additional-time-to-correct-violations', title: 'Request Additional Time to Correct', description: 'Prepare a documented request for additional correction time.' },
    { slug: 'submit-proof-of-correction', title: 'Submit Proof of Correction', description: 'Package correction evidence and the accompanying submission.' },
    { slug: 'challenge-inspection-findings', title: 'Challenge Inspection Findings', description: 'Respond to disputed inspection findings with an organized record.' },
    { slug: 'request-administrative-hearing', title: 'Request an Administrative Hearing', description: 'Prepare the request and supporting matter record.' },
    { slug: 'request-case-closure', title: 'Request Case Closure', description: 'Document the basis for asking the agency to close the matter.' },
  ],
  outcomes: [
    'Notice, property facts, evidence, and response stay connected.',
    'The exact outgoing document remains reviewable before mailing.',
    'Attachments and correction proof remain part of the matter record.',
    'Available delivery, tracking, and proof records remain together.',
  ],
  safetyTitle: 'Build the response around the record.',
  safetyBody: 'Choose the workflow that matches the notice or action you received and keep each consequential step reviewable.',
  faqs: [
    ['Can I start from an inspection notice?', 'Yes. The workflow begins with the document or agency action in front of you.'],
    ['Do I have to mail the response?', 'No. You can review and download the prepared response, or use supported mailing and proof options.'],
  ],
  related: [
    { name: 'Records Requests', path: '/records-request', description: 'Request agency records connected to the matter.' },
    { name: 'Dispute Mail', path: '/dispute-mail', description: 'Prepare focused correspondence when the issue is contested.' },
  ],
}

export const Route = createFileRoute('/')({ component: () => <SectionLandingPage config={config} /> })
