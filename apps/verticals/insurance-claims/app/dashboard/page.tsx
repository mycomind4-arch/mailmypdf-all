import { createElement } from 'react'
import Link from 'next/link'
import { INSURANCE_WORKFLOWS } from '@/domain/insurance-workflows'
import {
  createWorkflowHub,
  createWorkspacePageHeader,
  createWorkspaceShell,
  createWorkspaceTopbar,
} from '../../../../packages/design-system/src/index'

const WorkspaceShell = createWorkspaceShell(createElement)
const WorkspaceTopbar = createWorkspaceTopbar(createElement)
const WorkspacePageHeader = createWorkspacePageHeader(createElement)
const WorkflowHub = createWorkflowHub(createElement)
const MAILMYPDF = 'https://mailmypdf.pages.dev'

export const metadata = {
  title: 'Insurance Claims Workspace — MailMyPDF',
  description: 'Insurance claim workflow hub for claim preparation, denials, disputes, evidence, review, and mailing proof.',
  robots: { index: false, follow: false },
}

export default function DashboardPage() {
  const featuredIds = ['denied-claim', 'homeowners-claim', 'underpaid-claim', 'health-medical-denial', 'auto-claim', 'business-interruption-claim'] as const
  const featured = featuredIds.map(id => INSURANCE_WORKFLOWS.find(workflow => workflow.id === id)).filter((workflow): workflow is NonNullable<typeof workflow> => Boolean(workflow))

  const sections = [
    { label: 'Workspace', items: [
      { label: 'Overview', href: '/dashboard', active: true },
      { label: 'Workflow Hub', href: '/workflows' },
      { label: 'Start a Claim', href: '/start' },
      { label: 'Recent', href: '/dashboard#recent' },
    ] },
    { label: 'Account', items: [{ label: 'MailMyPDF Account', href: `${MAILMYPDF}/account` }] },
  ]

  return (
    <WorkspaceShell
      theme="insurance-claims"
      productName="Insurance Claims"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref={`${MAILMYPDF}/start`}
      ecosystemHref={`${MAILMYPDF}/products`}
      footer={<>Workspace foundation<br />Account data not connected in this app yet</>}
      topbar={
        <WorkspaceTopbar
          eyebrow="MailMyPDF"
          title="Insurance Claims"
          subtitle="Claim → Coverage → Evidence → Timeline → Response → Review → Mail → Proof"
          actions={<Link href="/workflows" className="mmp-button-secondary">Workflows</Link>}
          account={<a href={`${MAILMYPDF}/account`} className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">IC</span><span>MailMyPDF Account</span></a>}
        />
      }
    >
      <WorkspacePageHeader
        eyebrow="Claim workspace"
        title="Keep the policy, loss record, evidence, insurer position, and response connected."
        description="Insurance Claims uses problem-specific workflows for new claims, denials, property losses, disputes, health and disability matters, and specialized claims. Each workflow keeps source facts separate from generated suggestions and requires review before consequential mailing."
        actions={<Link href="/start" className="mmp-button-primary">Start a claim →</Link>}
        meta={<><span>{INSURANCE_WORKFLOWS.length} available insurance workflows</span><span>Human review required by workflow contract</span></>}
      />

      <WorkflowHub
        title="Choose the claim problem that matches the record."
        description="The hub uses the real Insurance Claims domain catalog. Evidence lists, intake fields, outputs, risk level, and guardrails remain workflow-specific while the workspace presentation is shared."
        actions={<Link href="/workflows" className="mmp-button-secondary">Browse full catalog</Link>}
        items={featured.map(workflow => ({
          title: workflow.name,
          description: workflow.description,
          href: `/workflows/${workflow.id}`,
          eyebrow: workflow.family,
          badge: workflow.risk,
          meta: `${workflow.requiredEvidence.length} evidence categories · review ${workflow.requiresReview ? 'required' : 'configured by workflow'}`,
        }))}
      />

      <section id="recent" className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Claim history</h2></div>
        <div className="mmp-workspace-panel mmp-workspace-empty">
          <h3>Account case history is not wired into this app yet.</h3>
          <p>No sample claims, fake adjuster activity, invented payment amounts, or placeholder tracking numbers are shown. Once owner-scoped claim persistence is connected, this surface can render real claim records using the same shared workspace components.</p>
          <Link href="/workflows" className="mmp-button-primary mt-5">Choose a claim workflow</Link>
        </div>
      </section>
    </WorkspaceShell>
  )
}