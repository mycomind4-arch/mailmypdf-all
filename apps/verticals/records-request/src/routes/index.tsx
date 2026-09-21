import { createFileRoute } from '@tanstack/react-router'
import { SectionLandingPage, type SectionLandingConfig } from '@mailmypdf/design-system/public'
import { recordsWorkflows } from '../workflows'

const config: SectionLandingConfig = {
  id: 'records-request',
  name: 'Records Requests',
  path: '',
  tone: 'dark',
  seoTitle: 'Records Requests — Public Records, FOIA & Government Records | MailMyPDF',
  seoDescription: 'Prepare focused public-records, FOIA, police, court, property, vital-records, and government-record requests.',
  eyebrow: 'Records Requests · Access. Information. Accountability.',
  heroTitle: "Get the records you're looking for.",
  heroDescription: 'Choose a focused public-records workflow, describe the information and agency, review the exact request, and keep the request, delivery, response, follow-up, and proof record connected.',
  heroImage: '/ecosystem-hero-sprite.jpg',
  introTitle: 'Start with the kind of record you need.',
  introText: 'The strongest request is specific about the records objective without pretending every agency, jurisdiction, or record family works the same way.',
  trustLead: 'Focused request types',
  topics: [
    { title: 'Law enforcement and courts', text: 'Request focused police, court, arrest, and criminal-justice records.' },
    { title: 'Property and development', text: 'Identify permits, planning files, inspections, and property records.' },
    { title: 'Vital and personal records', text: 'Organize requests for birth, marriage, death, military, medical, employment, and education records.' },
    { title: 'Follow-up and appeals', text: 'Keep denials, follow-ups, scope changes, and delivery records connected.' },
  ],
  featured: recordsWorkflows.slice(0, 8).map((workflow) => ({
    slug: workflow.id,
    title: workflow.name,
    description: workflow.description,
  })),
  outcomes: [
    'The records objective, agency, scope, and date range stay connected.',
    'The exact request remains reviewable before delivery.',
    'Responses, denials, follow-ups, and supporting records remain together.',
    'Available delivery, tracking, and proof records remain part of the matter.',
  ],
  safetyTitle: 'Make the request specific. Keep proof of what you sent.',
  safetyBody: 'Find the workflow that matches the records you need and move into the request process with the scope and delivery record intact.',
  faqs: [
    ['Can I request records from a local agency?', 'Yes. Choose the closest records family and identify the agency or institution likely to hold the information.'],
    ['What if the agency denies or narrows the request?', 'Use the follow-up and appeal workflows to keep the response, revised scope, and next correspondence connected.'],
  ],
  related: [
    { name: 'Code Enforcement', path: '/code-enforcement', description: 'Respond to notices and agency actions with an organized record.' },
    { name: 'Dispute Mail', path: '/dispute-mail', description: 'Prepare focused correspondence when the issue is contested.' },
  ],
}

export const Route = createFileRoute('/')({
  component: () => <SectionLandingPage config={config} />,
  head: () => ({ meta: [{ title: config.seoTitle }, { name: 'description', content: config.seoDescription }, { name: 'robots', content: 'index,follow' }] }),
})
