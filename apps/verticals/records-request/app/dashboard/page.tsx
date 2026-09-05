import { createElement } from 'react'
import Link from 'next/link'
import { MAILMYPDF_HOME } from '../lib/ecosystem'
import { workflows } from '../workflows/workflow-data'
import { getRequestStateRepositoryAsync } from '../../src/runtime'
import { getApprovalPrincipal } from '../../src/authorization-runtime'
import type { RequestState } from '../../src/request-repository'
import {
  createWorkflowHub,
  createWorkspaceMetrics,
  createWorkspacePageHeader,
  createWorkspaceShell,
  createWorkspaceTopbar,
} from '../../../../packages/design-system/src/index'

const WorkspaceShell = createWorkspaceShell(createElement)
const WorkspaceTopbar = createWorkspaceTopbar(createElement)
const WorkspacePageHeader = createWorkspacePageHeader(createElement)
const WorkspaceMetrics = createWorkspaceMetrics(createElement)
const WorkflowHub = createWorkflowHub(createElement)

const activeStates: RequestState[] = ['draft', 'validated', 'review', 'approved', 'queued', 'submitted', 'tracking']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Records Requests Workspace — MailMyPDF',
  description: 'Track your records requests, deadlines, productions, and unresolved gaps.',
  robots: { index: false, follow: false },
}

export default async function Dashboard() {
  const principal = await getApprovalPrincipal()
  const repository = principal ? await getRequestStateRepositoryAsync() : null
  const requests = principal && repository ? await repository.listRequests(principal.subject) : []
  const active = requests.filter((request) => activeStates.includes(request.status))
  const review = requests.filter((request) => request.status === 'review').length
  const completed = requests.filter((request) => request.status === 'completed').length
  const failed = requests.filter((request) => request.status === 'failed').length
  const featured = workflows.slice(0, 6)

  const sections = [
    { label: 'Workspace', items: [
      { label: 'Overview', href: '/dashboard', active: true },
      { label: 'Workflow Hub', href: '/workflows' },
      { label: 'Requests', href: '/dashboard#requests', badge: requests.length },
      { label: 'Recent', href: '/dashboard#requests' },
    ] },
    { label: 'Account', items: [{ label: 'MailMyPDF Account', href: MAILMYPDF_HOME }] },
  ]

  return (
    <WorkspaceShell
      theme="records-request"
      productName="Records Requests"
      productLabel="MailMyPDF"
      homeHref="/"
      sections={sections}
      mailPdfHref={MAILMYPDF_HOME}
      ecosystemHref={`${MAILMYPDF_HOME}/products`}
      footer={principal ? <>Authenticated workspace<br />Owner-scoped request records</> : <>Private workspace<br />Authentication required</>}
      topbar={
        <WorkspaceTopbar
          eyebrow="MailMyPDF Account"
          title="Records Requests"
          subtitle="Define → Validate → Send → Track → Receive → Audit"
          actions={<Link href="/workflows" className="mmp-button-secondary">Workflows</Link>}
          account={<a href={MAILMYPDF_HOME} className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">RR</span><span>{principal ? 'Account' : 'Sign in'}</span></a>}
        />
      }
    >
      <WorkspacePageHeader
        eyebrow="Request command center"
        title="Track the request, the production, and what is still missing."
        description="Records Requests turns a plain-English objective into precise record categories, dates, custodians, identifiers, and scope. The private workspace keeps request state, review gates, agency activity, and completion status tied to the authenticated owner."
        actions={<Link className="mmp-button-primary" href="/workflows">Start a request →</Link>}
        meta={<><span>{workflows.length} request workflows</span><span>Owner-scoped private records</span></>}
      />

      {!principal ? (
        <section className="mmp-workspace-panel mmp-workspace-empty">
          <h3>Sign in to access your requests</h3>
          <p>Private request state is owner-scoped. Authentication must resolve before this workspace will query or display request records.</p>
          <a className="mmp-button-primary mt-5" href={MAILMYPDF_HOME}>Open MailMyPDF Account</a>
        </section>
      ) : !repository ? (
        <section className="mmp-workspace-panel mmp-workspace-empty">
          <h3>Records storage is not configured</h3>
          <p>The authenticated workspace is available, but the request-state repository is not available in this runtime. No placeholder records are shown.</p>
        </section>
      ) : (
        <>
          <WorkspaceMetrics metrics={[
            { label: 'Active requests', value: active.length },
            { label: 'Awaiting review', value: review },
            { label: 'Completed', value: completed },
            { label: 'Needs intervention', value: failed },
          ]} />

          <WorkflowHub
            title="Start with the records you actually need."
            description="Each workflow supplies a different records vocabulary, narrowing strategy, evidence context, and SEO authority page while using the same request-state, review, delivery, and audit architecture."
            actions={<Link href="/workflows" className="mmp-button-secondary">Browse all workflows</Link>}
            items={featured.map((workflow) => ({
              title: workflow.title,
              description: workflow.description,
              href: `/workflows/${workflow.slug}`,
              eyebrow: workflow.category,
              badge: 'Available',
              meta: workflow.bestFor.slice(0, 3).join(' · '),
            }))}
          />

          <section id="requests" className="mmp-workspace-section">
            <div className="mmp-workspace-section__head">
              <h2>Your requests</h2>
              <span style={{ color: 'var(--mmp-ink-muted)', fontSize: '.75rem' }}>Live account data</span>
            </div>
            <div className="mmp-workspace-panel">
              {requests.length === 0 ? (
                <div className="mmp-workspace-empty">
                  <h3>No requests yet</h3>
                  <p>Choose the workflow that matches the agency or records problem. The resulting request will appear here after it is persisted to your account.</p>
                  <Link className="mmp-button-primary mt-5" href="/workflows">Start a records request</Link>
                </div>
              ) : (
                <div className="mmp-workspace-list">
                  {requests.map((request) => (
                    <div className="mmp-workspace-row" key={request.id}>
                      <div className="mmp-workspace-row__main">
                        <div className="mmp-workspace-row__title">{request.title}</div>
                        <div className="mmp-workspace-row__meta">{request.agency} · {request.id} · Updated {new Date(request.updatedAt).toLocaleString()}</div>
                      </div>
                      <span className="mmp-workflow-hub-card__badge">{request.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mmp-workspace-section">
            <div className="mmp-workspace-section__head"><h2>Request lifecycle</h2></div>
            <div className="mmp-process-grid">
              {[
                ['1', 'Define', 'Turn the goal into precise record categories, dates, custodians, and identifiers.'],
                ['2', 'Validate', 'Check agency, jurisdiction, scope, searchability, and any request-specific constraints.'],
                ['3', 'Send & track', 'Keep review, approval, submission, and agency communications tied to the request.'],
                ['4', 'Receive', 'Organize productions and preserve what the agency actually provided.'],
                ['5', 'Audit', 'Compare the original scope against the production and turn missing categories into targeted follow-up.'],
              ].map(([number, title, description]) => (
                <div className="mmp-process-step" key={number}>
                  <div className="mmp-process-step__number">{number}</div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </WorkspaceShell>
  )
}