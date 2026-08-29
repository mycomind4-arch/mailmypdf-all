import { useState, useCallback, useRef } from 'react'
import { SiteHeader } from './components/site-header'
import { SiteFooter } from './components/site-footer'
import { FAQSection } from './components/faq-section'

const STEPS = [
  { id: 'intro', label: 'Start' },
  { id: 'document', label: 'Notice' },
  { id: 'facts', label: 'Facts' },
  { id: 'objective', label: 'Objective' },
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'Review' },
  { id: 'attachments', label: 'Evidence' },
  { id: 'recipient', label: 'Recipient' },
  { id: 'mailing', label: 'Mail' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'done', label: 'Done' },
]

const REVIEW_CHECKS = [
  'I reviewed every factual statement in this draft.',
  'Permit numbers, dates, code references, and property addresses are correct.',
  'I reviewed the uploaded notice and applicable building code sections.',
  'I understand Permit Reply is not providing legal or engineering advice.',
]

const NOTICE_TYPES = [
  { title: 'Permit Denial', desc: 'Building permit or construction permit application denied. Respond with reconsideration request citing code compliance.', urgency: 'urgent' },
  { title: 'Plan Review Comments', desc: 'Building department review of submitted plans with required corrections. Address each comment and resubmit revised plans.', urgency: 'time-sensitive' },
  { title: 'Failed Inspection', desc: 'Building inspection failed — corrections required before work can continue. Describe corrections and request reinspection.', urgency: 'urgent' },
  { title: 'Zoning Violation Notice', desc: 'Notice of zoning code violation — use, setback, height, or occupancy. Respond with compliance plan or dispute.', urgency: 'urgent' },
  { title: 'Planning Commission Comments', desc: 'Comments from planning commission or design review board. Address conditions and request approval.', urgency: 'moderate' },
  { title: 'Stop-Work Order', desc: 'Construction halted due to code violation or permit issue. Respond with correction plan and request to resume work.', urgency: 'critical' },
  { title: 'Notice of Violation (NOV)', desc: 'Formal code enforcement notice with penalties and compliance deadline. Respond with correction plan or appeal.', urgency: 'critical' },
  { title: 'Permit Revocation Notice', desc: 'Notice of intent to revoke an existing permit. Respond with reasons the permit should remain active.', urgency: 'critical' },
  { title: 'Variance Denial', desc: 'Variance or special use permit application denied. Respond with appeal or reconsideration request.', urgency: 'time-sensitive' },
  { title: 'Certificate of Occupancy Denial', desc: 'CO denied due to incomplete work or code violations. Respond with correction plan and reinspection request.', urgency: 'urgent' },
]

const MAIL_OPTIONS = [
  { id: 'standard', label: 'Standard', price: '$4.99', desc: '3–7 business days · Tracking included' },
  { id: 'certified', label: 'Certified', price: '$14.94', desc: 'Delivery tracking + confirmation · 3–7 days' },
  { id: 'registered', label: 'Registered', price: '$32.49', desc: 'Secure handling + tracking · 5–10 days' },
]

function App() {
  const [step, setStep] = useState(0)
  const [workflowStarted, setWorkflowStarted] = useState(false)
  const [noticeType, setNoticeType] = useState('')
  const [permitNumber, setPermitNumber] = useState('')
  const [noticeDate, setNoticeDate] = useState('')
  const [responseDeadline, setResponseDeadline] = useState('')
  const [authority, setAuthority] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [facts, setFacts] = useState('')
  const [objective, setObjective] = useState('')
  const [draft, setDraft] = useState('')
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false))
  const [mailType, setMailType] = useState('certified')
  const [recipient, setRecipient] = useState({ name: '', org: '', address1: '', address2: '', city: '', state: '', zip: '' })
  const [done, setDone] = useState(false)
  const workflowRef = useRef<HTMLDivElement>(null)
  const allChecked = checks.every(Boolean)

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true)
    setTimeout(() => workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [])

  function generateDraft() {
    return `Re: Response to ${noticeType || 'Permit Authority Notice'}
${permitNumber ? `Permit/Application Number: ${permitNumber}` : ''}
${propertyAddress ? `Property: ${propertyAddress}` : ''}
${noticeDate ? `Notice Date: ${noticeDate}` : ''}
${responseDeadline ? `Response Deadline: ${responseDeadline}` : ''}

${authority ? `Dear ${authority},` : 'To Whom It May Concern,'}

I am writing in response to the ${noticeType || 'notice'} referenced above. ${objective || '[Your objective will appear here.]'}

${facts || '[The facts you provided will appear here.]'}

I respectfully request that you consider this response and the documentation provided. Thank you for your attention to this matter.

Sincerely,
[Your Name]`
  }

  function canContinue() {
    switch (step) {
      case 1: return noticeType.trim().length > 0
      case 2: return facts.trim().length > 0
      case 3: return objective.trim().length > 0
      case 5: return allChecked
      case 7: return !!(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip)
      default: return true
    }
  }

  function next() {
    if (step === 4 && !draft) setDraft(generateDraft())
    if (step === STEPS.length - 1) { setDone(true); return }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function prev() { if (step > 0) setStep((s) => s - 1) }

  if (done) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <div className="postmark mx-auto w-fit">Complete</div>
          <h1 className="mt-6 font-serif text-4xl">Your response has been submitted</h1>
          <p className="mt-4 text-base leading-7 text-ink-soft">Your response is being prepared for mailing. You will receive a tracking number once it ships. Certified mail provides delivery confirmation — your record of timely response.</p>
          <a href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">Return home</a>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <a href="https://mailmypdf.com" className="hover:text-stamp transition-colors">MailMyPDF</a>
              <span className="text-rule">/</span>
              <span className="text-ink-soft">Permit Reply</span>
            </nav>
            <div className="postmark w-fit mt-6">Permit Response</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">permit authority</span> with documented proof
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              You received a notice from your building department, planning commission, or zoning board — permit denial, plan review comments, failed inspection, or violation. Upload it, extract the facts and deadlines, organize your evidence, and prepare a documented response. Send it certified. Keep the proof.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                Start your response
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <a href="https://notice-respond.pages.dev/workflows/permit-denial-response" className="inline-flex items-center gap-2 rounded-full border border-stamp/40 bg-stamp/5 px-6 py-3.5 text-sm font-medium text-stamp transition-colors hover:bg-stamp/10">Start the full workflow →</a>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Notice types" value="10+" />
              <KeyFact label="Typical deadline" value="30–180 days" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* WHAT IS */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a permit authority notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A permit authority notice is a formal written communication from your building department, planning commission, or zoning board demanding action — correct a plan review comment, fix a failed inspection, respond to a violation, or request reconsideration of a permit denial. The notice should state the reason, the action required, and the deadline to comply.</p>
              <p>Most notices have strict deadlines. A plan review correction may give 180 days. A failed inspection may require correction within 30 days. A stop-work order halts construction immediately until corrections are made. Missing the deadline can result in permit revocation, fines, or enforcement action.</p>
              <p>Responding in writing — with facts, code references, and proof of timely delivery — protects your project and your investment. It creates a record that you received the notice, understood it, and responded within the deadline. Certified mail is the gold standard for that proof.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What the notice includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Notice type (denial, correction, violation)</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Permit or application number</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Code sections cited</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Required corrections or actions</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Deadline to comply or respond</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Property address</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Inspector or reviewer name</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Authority department and contact</li>
              </ul>
            </div>
          </div>
        </section>

        {/* NOTICE TYPES */}
        <section id="notice-types" className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notice types</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">Which notice did you receive?</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">Permit Reply handles the full range of building, planning, and zoning notices — each with different deadlines, code references, and response strategies.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NOTICE_TYPES.map((nt) => (
                <div key={nt.title} className="envelope-card envelope-card-hover p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-serif text-lg text-ink">{nt.title}</div>
                    <UrgencyBadge urgency={nt.urgency} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{nt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CODE REFERENCE */}
        <section id="code" className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Code reference</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">Building codes you may need to cite</h2>
            <div className="mt-8 grid gap-4">
              <CodeRef code="IBC" title="International Building Code" desc="Model code adopted by most jurisdictions for structural, fire, and safety requirements. Local amendments may apply." />
              <CodeRef code="IRC" title="International Residential Code" desc="Model code for one- and two-family dwellings. Covers construction, structural, and mechanical requirements." />
              <CodeRef code="NEC" title="National Electrical Code (NFPA 70)" desc="Electrical safety standards. Cited in electrical permit corrections and inspection failures." />
              <CodeRef code="IPC" title="International Plumbing Code" desc="Plumbing installation, venting, and backflow requirements. Cited in plumbing inspection corrections." />
              <CodeRef code="IECC" title="International Energy Conservation Code" desc="Energy efficiency requirements for insulation, HVAC, and building envelope. Cited in plan review." />
              <CodeRef code="ADA" title="Americans with Disabilities Act" desc="Accessibility requirements. Cited in commercial permit reviews and variance requests." />
            </div>
            <div className="mt-8 rounded-lg border border-stamp/30 bg-stamp/5 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">Important</div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">Building codes are adopted and amended at the state, county, and city level. The code edition in force in your jurisdiction may differ from the model code. Always verify the applicable code edition with your local building department. Permit Reply helps you prepare a documented response but does not provide engineering or legal advice. For complex permit disputes, consult a licensed engineer or land use attorney.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">The process</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">How Permit Reply works</h2>
            <div className="mt-8 grid gap-6">
              <ProcessStep number="01" title="Upload the notice" text="Upload your permit authority notice as a PDF or photo. The system extracts the notice type, permit number, cited code sections, deadlines, and required corrections — you verify everything." />
              <ProcessStep number="02" title="Organize your facts" text="Review the extracted information. Add your own facts — what happened, what corrections you've made, and what outcome you want. Everything is grounded in your documents and your words." />
              <ProcessStep number="03" title="Prepare your response" text="The system helps draft your response letter, addressing each issue in the notice with code references and evidence. You review every word before anything is sent. Nothing is mailed without your explicit approval." />
              <ProcessStep number="04" title="Send with proof" text="Choose your mail type — certified mail is recommended for proof of timely delivery. Your response is printed, mailed, and tracked. You receive delivery confirmation as your record." />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section id="start" ref={workflowRef} className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Interactive workflow</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">Prepare your response step by step</h2>
            {!workflowStarted ? (
              <div className="mt-8 text-center">
                <p className="text-base leading-7 text-ink-soft">Walk through each step of the response process. You'll review the notice, organize your facts, draft your response, and choose your mail type — all before anything is sent.</p>
                <button onClick={startWorkflow} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                  Start the workflow
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </div>
            ) : (
              <div className="mt-8">
                <div className="flex flex-wrap gap-1.5 border-b border-rule/60 pb-5">
                  {STEPS.map((s, i) => (
                    <button key={s.id} onClick={() => setStep(i)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${i === step ? 'bg-ink text-paper' : i < step ? 'text-stamp' : 'text-muted-foreground'}`}>
                      <span className={`font-mono ${i === step ? 'text-paper/70' : 'text-rule'}`}>{String(i + 1).padStart(2, '0')}</span>
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 min-h-[300px]">
                  {step === 0 && (
                    <div>
                      <div className="postmark w-fit">1 · Start</div>
                      <h3 className="mt-4 font-serif text-3xl">Let's prepare your response</h3>
                      <p className="mt-3 text-muted-foreground">You'll review the notice, organize your facts, draft your response, attach evidence, choose your mail type, and send — all step by step.</p>
                      <div className="mt-6 rounded-lg border border-rule/60 bg-card p-5">
                        <div className="font-mono text-xs uppercase tracking-widest text-stamp">Before you begin</div>
                        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                          <li className="flex items-center gap-2"><span className="text-stamp">▸</span>Have your permit authority notice ready (PDF or photo)</li>
                          <li className="flex items-center gap-2"><span className="text-stamp">▸</span>Gather supporting documents (plans, reports, photos, correspondence)</li>
                          <li className="flex items-center gap-2"><span className="text-stamp">▸</span>Know the response deadline on the notice</li>
                          <li className="flex items-center gap-2"><span className="text-stamp">▸</span>Have the building department's mailing address</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {step === 1 && (
                    <div>
                      <div className="postmark w-fit">2 · Notice</div>
                      <h3 className="mt-4 font-serif text-3xl">Tell us about the notice</h3>
                      <p className="mt-3 text-muted-foreground">Enter the key details from your permit authority notice.</p>
                      <div className="mt-6 grid gap-4">
                        <div>
                          <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notice type</label>
                          <select value={noticeType} onChange={(e) => setNoticeType(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none">
                            <option value="">Select notice type…</option>
                            {NOTICE_TYPES.map((nt) => <option key={nt.title} value={nt.title}>{nt.title}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Permit / application number</label>
                            <input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="BLD-2026-01234" />
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Issuing authority</label>
                            <input value={authority} onChange={(e) => setAuthority(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="Building Department / Planning Commission" />
                          </div>
                        </div>
                        <div>
                          <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Property address</label>
                          <input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="123 Main Street" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Notice date</label>
                            <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" />
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Response deadline</label>
                            <input type="date" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {step === 2 && (
                    <div>
                      <div className="postmark w-fit">3 · Facts</div>
                      <h3 className="mt-4 font-serif text-3xl">What are the facts?</h3>
                      <p className="mt-3 text-muted-foreground">Describe what happened. Include permit numbers, code sections cited, inspection dates, and any corrections you've already made. Be specific and factual.</p>
                      <textarea value={facts} onChange={(e) => setFacts(e.target.value)} className="mt-4 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 focus:border-stamp focus:outline-none min-h-[150px]" placeholder="On [date], I received a [notice type] for [property]. The notice states that [issue]. I have corrected/dispute this because [explanation with code references]…" />
                    </div>
                  )}
                  {step === 3 && (
                    <div>
                      <div className="postmark w-fit">4 · Objective</div>
                      <h3 className="mt-4 font-serif text-3xl">What outcome do you want?</h3>
                      <p className="mt-3 text-muted-foreground">State your objective clearly — request reconsideration, certify corrections, request reinspection, or appeal a denial.</p>
                      <textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-4 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm leading-7 focus:border-stamp focus:outline-none min-h-[120px]" placeholder="I am requesting reconsideration of the permit denial based on the following code compliance documentation…" />
                    </div>
                  )}
                  {step === 4 && (
                    <div>
                      <div className="postmark w-fit">5 · Draft</div>
                      <h3 className="mt-4 font-serif text-3xl">Review your draft</h3>
                      <p className="mt-3 text-muted-foreground">This is your response letter. Review every word before continuing.</p>
                      <div className="mt-4 rounded-lg border border-rule/60 bg-card p-6 font-sans text-sm leading-8 text-ink whitespace-pre-wrap min-h-[300px] shadow-card">{draft || generateDraft()}</div>
                    </div>
                  )}
                  {step === 5 && (
                    <div>
                      <div className="postmark w-fit">6 · Review</div>
                      <h3 className="mt-4 font-serif text-3xl">Review before anything is mailed</h3>
                      <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
                      <div className="mt-4 space-y-3">
                        {REVIEW_CHECKS.map((check, i) => (
                          <label key={i} className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((v, j) => j === i ? e.target.checked : v))} className="mt-0.5 h-4 w-4 rounded border-rule accent-stamp" />
                            <span className="text-sm leading-6 text-ink-soft">{check}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === 6 && (
                    <div>
                      <div className="postmark w-fit">7 · Evidence</div>
                      <h3 className="mt-4 font-serif text-3xl">Add supporting documents</h3>
                      <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — revised plans, engineering reports, inspection reports, photos, code analysis, correspondence.</p>
                      <div className="mt-4 flex items-center justify-center rounded-lg border-2 border-dashed border-rule/60 bg-card py-12 text-center">
                        <div>
                          <svg className="mx-auto h-8 w-8 text-rule" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          <p className="mt-2 text-sm text-ink-soft">Drop files here or click to upload</p>
                          <p className="text-xs text-muted-foreground">PDF, JPG, PNG — up to 25MB each</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {step === 7 && (
                    <div>
                      <div className="postmark w-fit">8 · Recipient</div>
                      <h3 className="mt-4 font-serif text-3xl">Where should we send it?</h3>
                      <p className="mt-3 text-muted-foreground">Enter the building department or authority's mailing address.</p>
                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Recipient name</label>
                            <input value={recipient.name} onChange={(e) => setRecipient(r => ({ ...r, name: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="Building Department" />
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Department</label>
                            <input value={recipient.org} onChange={(e) => setRecipient(r => ({ ...r, org: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="City of [City]" />
                          </div>
                        </div>
                        <div>
                          <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Address line 1</label>
                          <input value={recipient.address1} onChange={(e) => setRecipient(r => ({ ...r, address1: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="123 Main Street" />
                        </div>
                        <div>
                          <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Address line 2 (optional)</label>
                          <input value={recipient.address2} onChange={(e) => setRecipient(r => ({ ...r, address2: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="Suite 100" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">City</label>
                            <input value={recipient.city} onChange={(e) => setRecipient(r => ({ ...r, city: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" />
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">State</label>
                            <input value={recipient.state} onChange={(e) => setRecipient(r => ({ ...r, state: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="CA" />
                          </div>
                          <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">ZIP</label>
                            <input value={recipient.zip} onChange={(e) => setRecipient(r => ({ ...r, zip: e.target.value }))} className="mt-1.5 w-full rounded-md border border-rule bg-card px-3 py-2.5 text-sm focus:border-stamp focus:outline-none" placeholder="90001" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {step === 8 && (
                    <div>
                      <div className="postmark w-fit">9 · Mail</div>
                      <h3 className="mt-4 font-serif text-3xl">Choose your mail type</h3>
                      <p className="mt-3 text-muted-foreground">Certified mail is recommended for proof of timely delivery.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {MAIL_OPTIONS.map((opt) => (
                          <button key={opt.id} onClick={() => setMailType(opt.id)} className={`rounded-lg border p-4 text-left transition-colors ${mailType === opt.id ? 'border-stamp bg-stamp/5' : 'border-rule/60 bg-card hover:border-ink/30'}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-ink">{opt.label}</span>
                              {mailType === opt.id && <svg className="h-4 w-4 text-stamp" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            </div>
                            <div className="mt-1 font-serif text-xl text-stamp">{opt.price}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === 9 && (
                    <div>
                      <div className="postmark w-fit">10 · Checkout</div>
                      <h3 className="mt-4 font-serif text-3xl">Review and pay</h3>
                      <div className="mt-4 rounded-lg border border-rule/60 bg-card p-5">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-ink-soft">Mail type</span><span className="font-medium">{MAIL_OPTIONS.find(o => o.id === mailType)?.label}</span></div>
                          <div className="flex justify-between"><span className="text-ink-soft">Recipient</span><span className="font-medium">{recipient.name || '—'}{recipient.org ? `, ${recipient.org}` : ''}</span></div>
                          <div className="flex justify-between"><span className="text-ink-soft">Pages</span><span className="font-medium">1+ (letter + attachments)</span></div>
                          <div className="border-t border-rule/60 pt-2 flex justify-between"><span className="font-medium text-ink">Total</span><span className="font-serif text-xl text-stamp">{MAIL_OPTIONS.find(o => o.id === mailType)?.price}</span></div>
                        </div>
                        <button onClick={() => setStep(10)} className="mt-6 w-full rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">Pay and send</button>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Payment is processed securely. Your letter is printed, inserted in an envelope, and mailed via USPS. You receive tracking and delivery confirmation.</p>
                    </div>
                  )}
                </div>

                {step < 10 && (
                  <div className="mt-6 flex items-center justify-between border-t border-rule/60 pt-4">
                    <button onClick={prev} disabled={step === 0} className="rounded-full border border-rule px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink/30 disabled:opacity-40 disabled:cursor-not-allowed">← Back</button>
                    <span className="font-mono text-xs text-muted-foreground">{step + 1} / {STEPS.length}</span>
                    <button onClick={next} disabled={!canContinue()} className="rounded-full bg-ink px-6 py-2 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed">Continue →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* TRUST BAND */}
        <section id="trust" className="border-y border-rule/60 bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">Trust architecture</div>
            <h2 className="mt-5 font-serif text-3xl text-paper">You stay in control of every step.</h2>
            <p className="mt-4 text-base leading-7 text-paper/70">The notice is the source material. Your evidence remains under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft. Payment is distinct from authorization. Mailing creates a documented record.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for extraction. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact letter. Nothing is mailed without your explicit confirmation." />
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your record of timely response." />
            </div>
          </div>
        </section>

        {/* RELATED */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related workflows</div>
            <h2 className="mt-3 font-serif text-2xl">Other response types</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <RelatedCard href="https://notice-respond.pages.dev" title="Notice Respond" desc="Government notices, IRS letters, court summonses, and agency actions" />
              <RelatedCard href="https://tenant-reply.pages.dev" title="Tenant Reply" desc="Tenant responses to eviction notices, repair demands, and lease violations" />
              <RelatedCard href="https://claim-proof.pages.dev" title="Claim Proof" desc="Evidence-first claim documentation and proof packages" />
            </div>
            <div className="mt-6"><a href="https://mailmypdf.com/products" className="text-sm text-stamp hover:text-ink transition-colors">Browse all products →</a></div>
          </div>
        </section>

        <FAQSection />
      </main>
      <SiteFooter />
    </div>
  )
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    critical: 'text-red-600 border-red-200',
    urgent: 'text-orange-600 border-orange-200',
    'time-sensitive': 'text-stamp border-stamp/30',
    moderate: 'text-muted-foreground border-rule/60',
  }
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-widest ${colors[urgency] || colors.moderate}`}>{urgency.replace('-', ' ')}</span>
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-3 text-center">
      <div className="font-serif text-lg text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  )
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stamp/40 bg-stamp/5 font-mono text-sm font-semibold text-stamp">{number}</div>
      </div>
      <div className="flex-1 pb-2">
        <h3 className="font-serif text-xl text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
      </div>
    </div>
  )
}

function CodeRef({ code, title, desc }: { code: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-rule/60 bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp rounded border border-stamp/30 px-2 py-0.5">{code}</span>
        <h3 className="font-serif text-lg text-ink">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{desc}</p>
    </div>
  )
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-paper/15 p-4">
      <h3 className="font-medium text-paper">{title}</h3>
      <p className="mt-1.5 text-sm text-paper/60">{text}</p>
    </div>
  )
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a href={href} className="envelope-card envelope-card-hover block p-4">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </a>
  )
}

export default App
