import { createFileRoute } from '@tanstack/react-router'
import { SectionLandingPage, type SectionLandingConfig } from '@mailmypdf/design-system/public'
import { workflows } from '@/domain/workflows'

const config: SectionLandingConfig = {
  id: 'benefits-appeal',
  name: 'Benefits Appeal',
  path: '',
  tone: 'dark',
  seoTitle: "Benefits Appeal — Prepare a documented appeal | MailMyPDF",
  seoDescription: 'Organize a benefits denial, prepare a reviewable appeal, and optionally mail it with tracking and proof.',
  eyebrow: "Benefits Appeal · Protect the benefits you've earned",
  heroTitle: 'Appeal with clarity and confidence.',
  heroDescription: 'Use a focused workflow for a denied benefit, organize the record and supporting evidence, prepare a reviewable response, and choose optional MailMyPDF mailing with proof.',
  heroImage: '/hero.svg',
  introTitle: 'Start with the decision you received.',
  introText: 'Benefits Appeal keeps public workflow discovery open while protecting the private intake, uploaded documents, analysis, drafts, and mailing record behind your MailMyPDF account.',
  trustLead: 'Evidence-focused workflow',
  topics: [
    { title: 'Disability decisions', text: 'Organize SSI, SSDI, and other disability decisions around the stated reason and evidence.' },
    { title: 'Benefits and coverage', text: 'Prepare a focused response to benefits, Medicaid, insurance, or health coverage decisions.' },
    { title: 'Unemployment matters', text: 'Keep work, wage, separation, and deadline records together for an unemployment appeal.' },
    { title: 'Administrative appeals', text: 'Build a reviewable response from the actual notice rather than a blank generic letter.' },
  ],
  featured: Object.values(workflows).slice(0, 8).map((workflow) => ({
    slug: workflow.id,
    title: workflow.title,
    description: workflow.description,
  })),
  outcomes: [
    'The denial, deadline, facts, and supporting evidence stay connected.',
    'The appeal draft remains editable and reviewable before sending.',
    'The exact packet and attachments are checked before approval.',
    'Available mailing, tracking, and proof records remain together.',
  ],
  safetyTitle: 'Protect the record. Prepare the appeal. Keep the proof.',
  safetyBody: 'Choose the workflow that matches the decision you received and continue into the private account-scoped appeal workspace.',
  faqs: [
    ['Is this legal advice?', 'No. Benefits Appeal is a document-preparation and mailing-assistance tool, not a law firm and not a substitute for professional advice.'],
    ['What should I upload first?', 'Start with the denial, determination, or adverse decision. Individual workflows may ask for additional records and evidence.'],
    ['Do I have to use mailing?', 'No. You can prepare and download your documents, or choose supported mailing and proof options after review.'],
  ],
  related: [
    { name: 'Appeal Mail', path: '/appeal-mail', description: 'Explore broader appeal workflows for adverse decisions.' },
    { name: 'Dispute Mail', path: '/dispute-mail', description: 'Prepare focused correspondence when the decision or claim is contested.' },
  ],
}

export const Route = createFileRoute('/')({
  component: () => <SectionLandingPage config={config} />,
  head: () => ({ meta: [{ title: config.seoTitle }, { name: 'description', content: config.seoDescription }, { name: 'robots', content: 'index,follow' }] }),
})
