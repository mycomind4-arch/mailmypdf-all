import { EcosystemFooter } from "../components/EcosystemFooter"
import { MAILMYPDF_HOME } from "../lib/ecosystem"
import { getRequestStateRepositoryAsync } from '../../src/runtime'
import { getApprovalPrincipal } from '../../src/authorization-runtime'
import type { RequestState } from '../../src/request-repository'
import Link from 'next/link'

const activeStates: RequestState[] = ['draft', 'validated', 'review', 'approved', 'queued', 'submitted', 'tracking']

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard — Records Requests',
  description: 'Track your records requests, deadlines, productions, and unresolved gaps.',
  robots: { index: false, follow: false },
}

export default async function Dashboard() {
  const principal = await getApprovalPrincipal()
  const repository = principal ? await getRequestStateRepositoryAsync() : null
  const requests = principal && repository ? await repository.listRequests(principal.subject) : []
  const active = requests.filter((request) => activeStates.includes(request.status))
  const attention = requests.filter((request) => ['review', 'failed'].includes(request.status)).length
  const completed = requests.filter((request) => request.status === 'completed').length

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">My-CoMind <span>/ Records</span></div>
        <nav className="nav">
          <a className="active" href="#">Command Center</a>
          <a href="#requests">Requests</a>
          <a href="/#how">How it works</a>
          <a href="/workflows">Workflows</a>
          <a href={MAILMYPDF_HOME}>MailMyPDF →</a>
        </nav>
      </aside>
      <main className="main">
        <div className="top">
          <div>
            <div className="eyebrow">RECORDS INTELLIGENCE</div>
            <h1 className="title">Request Command Center</h1>
            <div className="muted">Track requests, deadlines, productions, and unresolved records gaps.</div>
          </div>
          <div className="actions">
            <Link className="btn primary" href="/workflows">Start a request →</Link>
          </div>
        </div>

        {!principal && (
          <section className="composer">
            <h2>Sign in to access your requests</h2>
            <div className="muted">Your records cases are owner-scoped. Authentication is required before private request data is shown.</div>
          </section>
        )}

        {principal && !repository && (
          <section className="composer">
            <h2>Records storage is not configured</h2>
            <div className="muted">The application is deployed, but the Cloudflare D1 binding is not available in this runtime.</div>
          </section>
        )}

        {principal && repository && (
          <>
            <section className="composer">
              <h2>What records are you looking for?</h2>
              <div className="muted">Start in plain English. A workflow will turn your objective into precise record categories, dates, and custodians.</div>
              <div className="composer-row">
                <input placeholder="e.g. Everything the county has about code enforcement at a property" readOnly onClick={() => window.location.href = '/workflows'} />
                <Link className="btn primary" href="/workflows">Browse workflows →</Link>
              </div>
            </section>

            <div className="grid">
              <div className="card">
                <div className="label">Active requests</div>
                <div className="metric">{active.length}</div>
                <div className="muted">{attention} need attention</div>
              </div>
              <div className="card">
                <div className="label">Awaiting review</div>
                <div className="metric">{requests.filter((r) => r.status === 'review').length}</div>
                <div className="muted">Owner review gate</div>
              </div>
              <div className="card">
                <div className="label">Completed</div>
                <div className="metric">{completed}</div>
                <div className="muted">Closed requests</div>
              </div>
              <div className="card">
                <div className="label">Failed</div>
                <div className="metric">{requests.filter((r) => r.status === 'failed').length}</div>
                <div className="muted">Requires intervention</div>
              </div>
            </div>

            <div className="layout">
              <section className="card" id="requests" style={{ padding: 18 }}>
                <div className="head">
                  <span>Your requests</span>
                  <span className="pill">Live</span>
                </div>
                {requests.length === 0 ? (
                  <div className="empty-state">
                    <h3>No requests yet</h3>
                    <p>Start with a description of the records you're looking for. We'll help turn it into a precise request.</p>
                    <Link className="btn primary" href="/workflows">Start a records request →</Link>
                  </div>
                ) : (
                  requests.map((r) => (
                    <div className="request" key={r.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                        <h3>{r.title}</h3>
                        <span className="pill">{r.status}</span>
                      </div>
                      <p>{r.agency} · {r.id}</p>
                      <p style={{ marginTop: 6 }}>Updated: <b>{new Date(r.updatedAt).toLocaleString()}</b></p>
                    </div>
                  ))
                )}
              </section>

              <aside className="card" id="how" style={{ padding: 18 }}>
                <div className="head">
                  <span>How it works</span>
                  <span className="pill">Evidence first</span>
                </div>
                <div className="dashSteps">
                  <div className="dashStep">
                    <span className="num">1</span>
                    <div><b>Define</b><div className="muted">Turn the goal into precise record categories, dates, and custodians.</div></div>
                  </div>
                  <div className="dashStep">
                    <span className="num">2</span>
                    <div><b>Validate</b><div className="muted">Check agency, jurisdiction, scope, and searchability.</div></div>
                  </div>
                  <div className="dashStep">
                    <span className="num">3</span>
                    <div><b>Send and track</b><div className="muted">Track approvals, productions, and communications.</div></div>
                  </div>
                  <div className="dashStep">
                    <span className="num">4</span>
                    <div><b>Audit</b><div className="muted">Compare requested records against what was produced.</div></div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    <EcosystemFooter />
    </div>
  )
}
