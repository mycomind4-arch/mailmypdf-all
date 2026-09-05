import React, { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Archive, CalendarDays, FileText, Inbox, LayoutDashboard, Mail, Plus, ShieldCheck, Users, Workflow, X } from 'lucide-react'
import '../../../../packages/design-system/src/workspace.css'
import './styles.css'
import './checkout-return'
import type { MailClass } from './domain/models'
import { nextOccurrence } from './services/scheduler'
import { CommandCenter } from './ui/CommandCenter'
import { SMALL_BUSINESS_WORKFLOWS, type SmallBusinessWorkflowId } from './domain/workflows'
import { planWorkflowExecution } from './services/workflow-engine'
import {
  createWorkflowHub,
  createWorkspaceMetrics,
  createWorkspacePageHeader,
  createWorkspaceShell,
  createWorkspaceTopbar,
  type WorkspaceLinkItem,
} from '../../../../packages/design-system/src/index'

const AUTH_KEY = 'mailmypdf_business_auth'
const MAILMYPDF = 'https://mailmypdf.pages.dev'

const WorkspaceShell = createWorkspaceShell(createElement)
const WorkspaceTopbar = createWorkspaceTopbar(createElement)
const WorkspacePageHeader = createWorkspacePageHeader(createElement)
const WorkspaceMetrics = createWorkspaceMetrics(createElement)
const WorkflowHub = createWorkflowHub(createElement)

type WorkspaceView = 'Overview' | 'Workflow Hub' | 'Command Center' | 'Correspondence' | 'Schedule' | 'Contacts' | 'Templates' | 'Automation' | 'Proof Archive'
type Scheduled = {
  id: string
  title: string
  recipient: string
  meta: string
  status: 'Scheduled' | 'Approval required' | 'Draft'
  at: string
  mailClass: MailClass
  workflowId: SmallBusinessWorkflowId
}

type SessionShape = {
  access_token?: string
  user?: { email?: string }
  email?: string
}

function readSession(): { accessToken: string; email: string } {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') as SessionShape | null
    return {
      accessToken: parsed?.access_token || '',
      email: parsed?.user?.email || parsed?.email || '',
    }
  } catch {
    return { accessToken: '', email: '' }
  }
}

function App() {
  const [active, setActive] = React.useState<WorkspaceView>('Overview')
  const [scheduled, setScheduled] = React.useState<Scheduled[]>([])
  const [showComposer, setShowComposer] = React.useState(false)
  const [composerWorkflow, setComposerWorkflow] = React.useState<SmallBusinessWorkflowId>('payment-reminder')
  const [session, setSession] = React.useState(() => readSession())
  const [checkoutMessage, setCheckoutMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    const onCheckout = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {}
      if (detail.error) setCheckoutMessage(String(detail.error))
      else setCheckoutMessage('Payment verified. The paid execution request has been handed to the configured mailing workflow.')
      setSession(readSession())
    }
    window.addEventListener('mailmypdf:checkout', onCheckout)
    return () => window.removeEventListener('mailmypdf:checkout', onCheckout)
  }, [])

  const approvalGated = SMALL_BUSINESS_WORKFLOWS.filter(workflow => workflow.requiresApproval || workflow.risk === 'HIGH' || workflow.risk === 'CRITICAL').length
  const sessionApprovals = scheduled.filter(item => item.status === 'Approval required').length

  function openComposer(workflowId: SmallBusinessWorkflowId = 'payment-reminder') {
    setComposerWorkflow(workflowId)
    setShowComposer(true)
  }

  async function createMailing(input: {
    title: string
    recipient: string
    date: string
    time: string
    mailClass: MailClass
    workflowId: SmallBusinessWorkflowId
    draftContent: string
  }) {
    const currentSession = readSession()
    setSession(currentSession)
    if (!currentSession.accessToken) {
      window.alert('Sign in to your MailMyPDF Account before creating a mailing.')
      return
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        businessId: 'current',
        workflowId: input.workflowId,
        title: input.title,
        draftContent: input.draftContent,
        mailClass: input.mailClass,
        recipient: { name: input.recipient },
        mailJobId: crypto.randomUUID(),
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.checkoutUrl) {
      window.alert(payload.error || 'Unable to start checkout.')
      return
    }

    const workflow = SMALL_BUSINESS_WORKFLOWS.find(item => item.id === input.workflowId)!
    setScheduled(current => [...current, {
      id: payload.sessionId || crypto.randomUUID(),
      title: input.title,
      recipient: input.recipient,
      meta: `${input.mailClass[0].toUpperCase() + input.mailClass.slice(1)} Mail · checkout started`,
      status: workflow.requiresApproval ? 'Approval required' : 'Draft',
      at: new Date(`${input.date}T${input.time}:00`).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      mailClass: input.mailClass,
      workflowId: input.workflowId,
    }])
    setShowComposer(false)
    window.location.assign(payload.checkoutUrl)
  }

  const navSections = [
    {
      label: 'Workspace',
      items: [
        { label: 'Overview', href: '#overview', icon: <LayoutDashboard />, active: active === 'Overview' },
        { label: 'Workflow Hub', href: '#workflow-hub', icon: <Workflow />, active: active === 'Workflow Hub' },
        { label: 'Command Center', href: '#command-center', icon: <ShieldCheck />, active: active === 'Command Center' },
        { label: 'Correspondence', href: '#correspondence', icon: <Mail />, active: active === 'Correspondence' },
        { label: 'Schedule', href: '#schedule', icon: <CalendarDays />, active: active === 'Schedule' },
        { label: 'Contacts', href: '#contacts', icon: <Users />, active: active === 'Contacts' },
        { label: 'Templates', href: '#templates', icon: <FileText />, active: active === 'Templates' },
        { label: 'Automation', href: '#automation', icon: <Workflow />, active: active === 'Automation' },
        { label: 'Proof Archive', href: '#proof', icon: <Inbox />, active: active === 'Proof Archive' },
      ],
    },
  ]

  const accountLabel = session.email || (session.accessToken ? 'Account connected' : 'Sign in required')
  const initials = session.email ? session.email.slice(0, 2).toUpperCase() : 'MB'

  function renderWorkspaceLink(item: WorkspaceLinkItem, className: string) {
    const matching = navSections[0].items.find(navItem => navItem.label === item.label)
    if (!matching) return <a href={item.href} className={className}>{item.label}</a>
    return (
      <button
        type="button"
        className={className}
        onClick={() => setActive(item.label as WorkspaceView)}
      >
        {item.icon ? <span className="mmp-workspace-nav__icon" aria-hidden="true">{item.icon}</span> : null}
        <span className="mmp-workspace-nav__label">{item.label}</span>
        {item.badge !== undefined ? <span className="mmp-workspace-nav__badge">{item.badge}</span> : null}
      </button>
    )
  }

  return (
    <>
      <WorkspaceShell
        theme="small-business"
        productName="MailMyPDF Business"
        productLabel="MailMyPDF"
        homeHref="/"
        sections={navSections}
        mailPdfHref={`${MAILMYPDF}/start`}
        ecosystemHref={`${MAILMYPDF}/products`}
        renderLink={renderWorkspaceLink}
        footer={<><strong>{accountLabel}</strong><br />Create → Schedule → Approve → Send → Track → Prove → Archive</>}
        topbar={
          <WorkspaceTopbar
            eyebrow="MailMyPDF Account"
            title="Business"
            subtitle="Correspondence, scheduling, approvals, mailing, and proof"
            actions={<button className="mmp-button-primary" onClick={() => openComposer()}><Plus size={15} /> Create mailing</button>}
            account={session.accessToken ? (
              <a href={`${MAILMYPDF}/account`} className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">{initials}</span><span>{accountLabel}</span></a>
            ) : (
              <a href={`${MAILMYPDF}/auth`} className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">MB</span><span>Sign in</span></a>
            )}
          />
        }
      >
        {checkoutMessage && <div className="mmp-workspace-panel" style={{ padding: '1rem 1.15rem', marginBottom: '1rem' }}>{checkoutMessage}</div>}

        {active === 'Overview' && (
          <Overview
            scheduled={scheduled}
            approvalCount={sessionApprovals}
            accountConnected={Boolean(session.accessToken)}
            approvalGated={approvalGated}
            onCreate={() => openComposer()}
            onWorkflows={() => setActive('Workflow Hub')}
          />
        )}
        {active === 'Workflow Hub' && <BusinessWorkflowHub onStart={openComposer} />}
        {active === 'Command Center' && <CommandCenter onCreateMailing={() => openComposer()} scheduledCount={scheduled.length} approvalCount={sessionApprovals} />}
        {active === 'Schedule' && <SchedulePage scheduled={scheduled} onCreate={() => openComposer()} />}
        {active === 'Correspondence' && <Correspondence scheduled={scheduled} />}
        {active === 'Contacts' && <FoundationPage eyebrow="Contacts" title="Keep recipients attached to the business record." description="The shared workspace is ready for owner-scoped contacts, addresses, identifiers, and correspondence history. No sample contacts are displayed before persistent contact storage is connected." />}
        {active === 'Templates' && <FoundationPage eyebrow="Templates" title="Reusable language, governed by workflow." description="Templates can become approved building blocks for repeat correspondence. This surface intentionally does not show invented templates before persistent template storage is connected." />}
        {active === 'Automation' && <Automation onBrowse={() => setActive('Workflow Hub')} />}
        {active === 'Proof Archive' && <FoundationPage eyebrow="Proof archive" title="Keep what was sent with the available delivery record." description="Completed mailing records can retain document identity, carrier status, and available proof. This surface remains empty until real owner-scoped proof records are connected." />}
      </WorkspaceShell>

      {showComposer && <Composer initialWorkflow={composerWorkflow} onClose={() => setShowComposer(false)} onCreate={createMailing} />}
    </>
  )
}

function Overview({
  scheduled,
  approvalCount,
  accountConnected,
  approvalGated,
  onCreate,
  onWorkflows,
}: {
  scheduled: Scheduled[]
  approvalCount: number
  accountConnected: boolean
  approvalGated: number
  onCreate: () => void
  onWorkflows: () => void
}) {
  return (
    <>
      <WorkspacePageHeader
        eyebrow="Business correspondence workspace"
        title="Everything important, prepared and sent through one controlled system."
        description="MailMyPDF Business adds repeatable scheduling, approval, and automation around the same document, mailing, tracking, and proof boundaries used by the rest of MailMyPDF. Operational counts below come only from this browser session until persistent business storage is connected."
        actions={<button className="mmp-button-primary" onClick={onCreate}><Plus size={15} /> Create mailing</button>}
        meta={<><span>{SMALL_BUSINESS_WORKFLOWS.length} governed workflows available</span><span>{approvalGated} require approval by current workflow policy</span></>}
      />

      <WorkspaceMetrics metrics={[
        { label: 'Available workflows', value: SMALL_BUSINESS_WORKFLOWS.length, detail: 'Current real catalog' },
        { label: 'Approval-gated workflows', value: approvalGated, detail: 'Derived from workflow definitions' },
        { label: 'Session mailings', value: scheduled.length, detail: 'Not presented as persisted history' },
        { label: 'Account', value: accountConnected ? 'Connected' : 'Sign in', detail: accountConnected ? 'Bearer session detected' : 'Required before checkout' },
      ]} />

      <section className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Next best action</h2></div>
        <div className="mmp-workspace-panel" style={{ padding: '1.35rem' }}>
          {approvalCount > 0 ? (
            <><div className="mmp-eyebrow">Approval required</div><h3 style={{ margin: '.55rem 0 0', fontFamily: 'var(--mmp-font-display)', fontSize: '1.7rem', fontWeight: 400 }}>{approvalCount} session mailing{approvalCount === 1 ? '' : 's'} require approval.</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.6 }}>Approval requirements come from the selected workflow definition. Payment and any required human approval remain separate from drafting.</p></>
          ) : (
            <><div className="mmp-eyebrow">Ready to begin</div><h3 style={{ margin: '.55rem 0 0', fontFamily: 'var(--mmp-font-display)', fontSize: '1.7rem', fontWeight: 400 }}>Choose the business event that needs correspondence.</h3><p style={{ color: 'var(--mmp-ink-muted)', lineHeight: 1.6 }}>Start from a payment reminder, demand, renewal, compliance notice, or customer dispute response. The workflow determines its trigger, actions, approval policy, and default mail class.</p><div style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap', marginTop: '1rem' }}><button className="mmp-button-primary" onClick={onWorkflows}>Open Workflow Hub</button><button className="mmp-button-secondary" onClick={onCreate}>Create a mailing</button></div></>
          )}
        </div>
      </section>

      <section className="mmp-workspace-section">
        <div className="mmp-workspace-section__head"><h2>Session correspondence</h2><span style={{ color: 'var(--mmp-ink-muted)', fontSize: '.75rem' }}>Current browser session only</span></div>
        {scheduled.length === 0 ? (
          <div className="mmp-workspace-panel mmp-workspace-empty"><h3>No session mailings yet</h3><p>The old prototype populated this area with invented companies, dates, approval counts, tracking states, and delivery history. Those fixtures have been removed.</p></div>
        ) : (
          <SessionList scheduled={scheduled} />
        )}
      </section>
    </>
  )
}

function BusinessWorkflowHub({ onStart }: { onStart: (workflowId: SmallBusinessWorkflowId) => void }) {
  return (
    <>
      <WorkspacePageHeader
        eyebrow="Workflow Hub"
        title="Business workflows governed by trigger, risk, approval, and mail policy."
        description="The current catalog is deliberately small and real. Each workflow definition declares its trigger, governed actions, approval requirement, risk, and default mail class."
      />
      <WorkflowHub
        title="Choose a workflow"
        description="These five workflows are the executable catalog currently defined in the Small Business domain layer."
        items={SMALL_BUSINESS_WORKFLOWS.map(workflow => ({
          title: workflow.name,
          description: workflow.description,
          href: `#${workflow.id}`,
          eyebrow: workflow.trigger.type === 'event' ? 'Event triggered' : 'Condition triggered',
          badge: workflow.risk,
          meta: `${workflow.actions.length} governed actions · ${workflow.defaultMailClass} mail · ${workflow.requiresApproval ? 'approval required' : 'workflow policy applies'}`,
          icon: <Workflow />,
        }))}
        renderLink={(item, className, children) => {
          const workflow = SMALL_BUSINESS_WORKFLOWS.find(candidate => `#${candidate.id}` === item.href)
          return <button key={item.href} type="button" className={className} onClick={() => workflow && onStart(workflow.id)}>{children}</button>
        }}
      />
    </>
  )
}

function SchedulePage({ scheduled, onCreate }: { scheduled: Scheduled[]; onCreate: () => void }) {
  return (
    <>
      <WorkspacePageHeader eyebrow="Schedule" title="Put correspondence on a deliberate clock." description="One-time and recurring scheduling belongs here once the mailing inputs, workflow policy, payment, and approval requirements are satisfied." actions={<button className="mmp-button-primary" onClick={onCreate}><Plus size={15} /> Create mailing</button>} />
      {scheduled.length ? <SessionList scheduled={scheduled} /> : <div className="mmp-workspace-panel mmp-workspace-empty"><CalendarDays size={23} style={{ margin: '0 auto', color: 'var(--mmp-accent)' }} /><h3 style={{ marginTop: '1rem' }}>Nothing scheduled in this session</h3><p>Persistent schedules must come from authenticated business storage and the scheduling boundary. No calendar fixtures are generated here.</p></div>}
    </>
  )
}

function Correspondence({ scheduled }: { scheduled: Scheduled[] }) {
  return (
    <>
      <WorkspacePageHeader eyebrow="Correspondence" title="Every business letter should have an accountable state." description="Draft, approval, payment, mailing, tracking, and proof are different states. This view only shows session items created from the real checkout path; persisted correspondence will replace it when storage is connected." />
      {scheduled.length ? <SessionList scheduled={scheduled} /> : <div className="mmp-workspace-panel mmp-workspace-empty"><Mail size={23} style={{ margin: '0 auto', color: 'var(--mmp-accent)' }} /><h3 style={{ marginTop: '1rem' }}>No correspondence in this session</h3><p>Use the Workflow Hub or Create Mailing action to begin from a real workflow definition.</p></div>}
    </>
  )
}

function SessionList({ scheduled }: { scheduled: Scheduled[] }) {
  return (
    <div className="mmp-workspace-panel mmp-workspace-list">
      {scheduled.map(item => (
        <div className="mmp-workspace-row" key={item.id}>
          <div className="mmp-workspace-row__main"><div className="mmp-workspace-row__title">{item.title} · {item.recipient}</div><div className="mmp-workspace-row__meta">{item.meta} · {item.at} · {item.workflowId}</div></div>
          <span className="mmp-workflow-hub-card__badge">{item.status}</span>
        </div>
      ))}
    </div>
  )
}

function Automation({ onBrowse }: { onBrowse: () => void }) {
  return (
    <>
      <WorkspacePageHeader eyebrow="Automation" title="Turn real business events into reviewable correspondence." description="The workflow layer already declares event and condition triggers. Production automation should resolve real business data, validate policy, request approval when required, then pass paid work to the mailing boundary." actions={<button className="mmp-button-secondary" onClick={onBrowse}>Browse governed workflows</button>} />
      <div className="mmp-workspace-panel" style={{ padding: '1.4rem' }}>
        <div className="mmp-process-grid">
          {[
            ['1', 'Trigger', 'A real business event or condition becomes true.'],
            ['2', 'Prepare', 'Generate the correspondence from verified business inputs.'],
            ['3', 'Validate', 'Check recipient, document, schedule, workflow policy, and required evidence.'],
            ['4', 'Approve', 'Stop for human approval whenever the workflow requires it.'],
            ['5', 'Send & prove', 'After payment and approval, execute mailing and retain available tracking and proof.'],
          ].map(([number, title, description]) => <div className="mmp-process-step" key={number}><div className="mmp-process-step__number">{number}</div><h3>{title}</h3><p>{description}</p></div>)}
        </div>
      </div>
    </>
  )
}

function FoundationPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <><WorkspacePageHeader eyebrow={eyebrow} title={title} description={description} /><div className="mmp-workspace-panel mmp-workspace-empty"><Archive size={22} style={{ margin: '0 auto', color: 'var(--mmp-accent)' }} /><h3 style={{ marginTop: '1rem' }}>Shared workspace foundation ready</h3><p>Connect the owner-scoped repository for this surface before displaying operational records.</p></div></>
}

function WorkflowPolicyPreview({ workflowId }: { workflowId: SmallBusinessWorkflowId }) {
  const [planned, setPlanned] = React.useState(false)
  const workflow = SMALL_BUSINESS_WORKFLOWS.find(item => item.id === workflowId)!
  const plan = planned ? planWorkflowExecution({ workflowId, recipientId: 'preview-recipient', documentId: 'preview-document', evidenceCount: workflow.risk === 'LOW' ? 0 : 1 }) : null

  return (
    <div className="composer-preview">
      <span>Execution policy</span>
      <strong>{workflow.requiresApproval || workflow.risk === 'HIGH' || workflow.risk === 'CRITICAL' ? 'Approval required' : 'Ready when inputs are complete'}</strong>
      <small>{workflow.actions.length} governed actions · {workflow.defaultMailClass} default mail</small>
      <button className="secondary" type="button" style={{ marginTop: 10 }} onClick={() => setPlanned(true)}><ShieldCheck size={14}/> Preview policy check</button>
      {plan && <small style={{ marginTop: 8 }}>{plan.status}: {plan.reasons.length ? plan.reasons.join(' · ') : 'Current preview inputs satisfy the workflow policy.'}</small>}
    </div>
  )
}

function Composer({
  initialWorkflow,
  onClose,
  onCreate,
}: {
  initialWorkflow: SmallBusinessWorkflowId
  onClose: () => void
  onCreate: (input: { title: string; recipient: string; date: string; time: string; mailClass: MailClass; workflowId: SmallBusinessWorkflowId; draftContent: string }) => void
}) {
  const initial = SMALL_BUSINESS_WORKFLOWS.find(workflow => workflow.id === initialWorkflow) ?? SMALL_BUSINESS_WORKFLOWS[0]
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const [title, setTitle] = React.useState(initial.name)
  const [recipient, setRecipient] = React.useState('')
  const [date, setDate] = React.useState(tomorrow)
  const [time, setTime] = React.useState('09:00')
  const [mailClass, setMailClass] = React.useState<MailClass>(initial.defaultMailClass)
  const [repeat, setRepeat] = React.useState(false)
  const [workflowId, setWorkflowId] = React.useState<SmallBusinessWorkflowId>(initial.id)
  const [body, setBody] = React.useState('')
  const workflow = SMALL_BUSINESS_WORKFLOWS.find(item => item.id === workflowId)!
  const preview = nextOccurrence({ type: repeat ? 'recurring' : 'date', at: `${date}T${time}:00`, rrule: repeat ? 'FREQ=MONTHLY;BYMONTHDAY=1' : undefined, timezone: 'America/Los_Angeles' }, new Date())

  return (
    <div className="overlay">
      <div className="composer">
        <div className="composer-head"><div><div className="eyebrow">New mailing</div><h2 className="serif">Schedule correspondence.</h2></div><button className="icon-btn" onClick={onClose}><X size={17}/></button></div>
        <label>Workflow<select value={workflowId} onChange={event => { const id = event.target.value as SmallBusinessWorkflowId; const next = SMALL_BUSINESS_WORKFLOWS.find(item => item.id === id)!; setWorkflowId(id); setMailClass(next.defaultMailClass); setTitle(next.name) }}>{SMALL_BUSINESS_WORKFLOWS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>What are you sending?<input value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Recipient<input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Company or contact name" /></label>
        <label>Document content<textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Draft the letter that will be sent after payment and any required approval." rows={5} /></label>
        <div className="form-grid"><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Time<input type="time" value={time} onChange={event => setTime(event.target.value)} /></label></div>
        <label>Mail class<select value={mailClass} onChange={event => setMailClass(event.target.value as MailClass)}><option value="standard">Standard</option><option value="certified">Certified</option><option value="registered">Registered</option></select></label>
        <label className="check"><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} /> Repeat monthly</label>
        <WorkflowPolicyPreview workflowId={workflowId} />
        <div className="composer-preview"><span>Next run</span><strong>{preview ? preview.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</strong><small>Checkout is verified server-side before any paid execution is queued.</small></div>
        <div className="composer-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!recipient.trim() || !body.trim()} onClick={() => onCreate({ title, recipient, date, time, mailClass, workflowId, draftContent: body })}>Continue to secure checkout</button></div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
