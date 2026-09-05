import React from 'react'
import { ArrowUpRight, CalendarClock, FileText, Sparkles, Wand2 } from 'lucide-react'
import './command-center.css'

const suggestions = [
  'Prepare reminders for customers with invoices over 30 days overdue',
  'Show me correspondence waiting for approval',
  'Draft a certified response to an important customer notice',
]

export function CommandCenter({
  onCreateMailing,
  scheduledCount = 0,
  approvalCount = 0,
}: {
  onCreateMailing: () => void
  scheduledCount?: number
  approvalCount?: number
}) {
  const [prompt, setPrompt] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)

  return (
    <div className="command-center">
      <div className="command-hero">
        <div className="command-kicker"><Sparkles size={13}/> Business correspondence planning</div>
        <h2 className="serif">Tell MailMyPDF what<br/>needs to happen.</h2>
        <p>Turn a business goal into a reviewable plan. The planning surface can structure correspondence, scheduling, approval, mailing, and proof steps; it does not invent business records or execute anything without the required inputs and approval.</p>
        <div className="command-input-wrap">
          <Wand2 size={17}/>
          <input
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setSubmitted(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && prompt.trim()) setSubmitted(true) }}
            placeholder="e.g. Send overdue customers a reminder next Tuesday"
          />
          <button className="primary" disabled={!prompt.trim()} onClick={() => setSubmitted(true)}>Plan</button>
        </div>
        <div className="suggestions">
          {suggestions.map(s => <button key={s} onClick={() => setPrompt(s)}>{s}<ArrowUpRight size={12}/></button>)}
        </div>
        {submitted && (
          <div className="plan-card">
            <div className="plan-head">
              <div><div className="card-kicker">Proposed plan</div><div className="card-title">{prompt}</div></div>
              <span className="badge">Review required</span>
            </div>
            <div className="plan-steps">
              <div><span>01</span>Identify the qualifying business records and recipients</div>
              <div><span>02</span>Prepare correspondence from verified inputs</div>
              <div><span>03</span>Validate recipients, documents, schedule, and workflow policy</div>
              <div><span>04</span>Request approval when the workflow requires it</div>
              <div><span>05</span>Send, track, and archive available proof after payment and approval</div>
            </div>
            <div className="action-row"><button className="primary" onClick={onCreateMailing}>Start with a mailing</button></div>
          </div>
        )}
      </div>
      <div className="command-grid">
        <div className="mini-card"><CalendarClock size={17}/><strong>Upcoming</strong><span>{scheduledCount} session mailing{scheduledCount === 1 ? '' : 's'}</span></div>
        <div className="mini-card"><FileText size={17}/><strong>Needs review</strong><span>{approvalCount} session approval{approvalCount === 1 ? '' : 's'}</span></div>
        <div className="mini-card"><Sparkles size={17}/><strong>Planning boundary</strong><span>Draft · Analyze · Recommend · Review</span></div>
      </div>
    </div>
  )
}
