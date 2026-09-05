import { createFileRoute } from '@tanstack/react-router'
import { createElement } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { WORKFLOWS } from '@/domain/benefits-workflows'
import { createWorkflowDirectory } from '../../../../../../packages/design-system/src/index'

const WorkflowDirectory = createWorkflowDirectory(createElement)

export const Route = createFileRoute('/workflows/')({
  head: () => ({
    meta: [
      { title: 'Benefits Appeal Workflows | MailMyPDF' },
      { name: 'description', content: 'Browse benefits appeal workflows for Social Security, SSDI, SSI, Medicaid, unemployment, veterans benefits, overpayments, hearings, and other benefit decisions.' },
      { name: 'robots', content: 'index,follow' },
    ],
  }),
  component: WorkflowHub,
})

function WorkflowHub() {
  const families = [...new Set(WORKFLOWS.map(w => w.family))]
  const items = WORKFLOWS.map(w => ({
    id: w.id,
    title: w.name,
    category: w.family,
    description: w.description,
    href: `/workflows/${w.id}`,
    badge: `${w.risk} risk`,
    keywords: [w.name, w.family],
  }))

  return <main>
    <SiteHeader />
    <WorkflowDirectory
      productName='Benefits Appeal'
      title='Find the benefits appeal workflow that matches your decision.'
      description='Start with the denial, overpayment, hearing notice, or benefit decision you received. Browse by benefit family or search the full catalog before entering the private workflow.'
      items={items}
      categories={families.map(family => ({ id: family, label: family }))}
      searchPlaceholder='Search Social Security, Medicaid, unemployment, VA, overpayment…'
      helperTitle='Not sure which benefits workflow fits?'
      helperDescription='Use the agency and decision named on your notice to narrow the catalog. Starting the private intake still requires your MailMyPDF account.'
      helperHref='/workflows'
      helperLabel='Browse All Benefits'
      steps={[
        { title: 'Start with the decision', description: 'Choose the workflow that matches the benefit program and decision you received.' },
        { title: 'Organize the record', description: 'Add the notice, dates, facts, and supporting evidence relevant to the appeal.' },
        { title: 'Prepare and review', description: 'Build a structured appeal and review the exact packet before approval.' },
        { title: 'Send and keep proof', description: 'Download the packet or use MailMyPDF mailing and proof options when appropriate.' },
      ]}
      finalTitle='Protect the record. Prepare the appeal.'
      finalDescription='Choose the benefits workflow that matches the decision in front of you and move into the private appeal workspace.'
      finalHref='/workflows'
      finalLabel='Choose a Benefits Workflow'
    />
    <SiteFooter />
  </main>
}
