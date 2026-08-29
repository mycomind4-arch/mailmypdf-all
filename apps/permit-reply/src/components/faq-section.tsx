import { useState } from 'react'

interface FAQItem { question: string; answer: string }

const FAQS: FAQItem[] = [
  {
    question: "What is Permit Reply?",
    answer: "Permit Reply is a document and correspondence tool that helps property owners, contractors, and developers respond to permit authority notices — permit denials, plan review comments, failed inspections, zoning violations, and planning comments. You upload the notice, the system extracts the key facts, deadlines, and correction requirements, and you prepare a documented response. The response is mailed via certified mail with tracking and delivery confirmation.",
  },
  {
    question: "How long do I have to respond to a permit denial or correction notice?",
    answer: "Permit response deadlines vary by jurisdiction and notice type. A plan review correction notice typically gives 180 days to resubmit. A failed inspection may require correction within 30 to 60 days. A zoning violation notice may have a shorter compliance period. The deadline is printed on the notice — do not wait. Permit Reply helps you identify and meet the deadline, but does not provide legal advice.",
  },
  {
    question: "What should I include in my response to a permit authority notice?",
    answer: "Your response should address each issue raised in the notice. For a permit denial, state why the denial should be reconsidered and cite the applicable code section. For plan review comments, explain how each comment has been addressed in the revised plans. For a failed inspection, describe the corrections made and request reinspection. Include revised plans, engineering reports, code references, photos, and correspondence as supporting documentation.",
  },
  {
    question: "Does Permit Reply provide legal advice?",
    answer: "No. Permit Reply is a document and correspondence tool, not a law firm, engineering firm, or permit expediting service. It helps you organize your facts, prepare a written response, and mail it with proof of delivery. Building codes and zoning regulations vary by jurisdiction. For complex permit disputes, consult a land use attorney, licensed engineer, or permit expediter familiar with your local building department.",
  },
  {
    question: "What happens if I don't respond to a permit correction notice?",
    answer: "Failing to respond can result in the permit being revoked, the application being closed, or additional penalties. For zoning violations, non-response can lead to fines, liens, or enforcement action. For failed inspections, non-correction can result in a stop-work order. Always respond in writing and keep proof of your response — certified mail provides that proof.",
  },
  {
    question: "Can I send my permit response with tracking?",
    answer: "Yes. Certified mail with return receipt is the recommended method for sending a permit response. It provides proof of mailing and proof of delivery — your record that the response was submitted on time. Permit Reply offers certified mail as a mailing option, with tracking and delivery confirmation included.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="border-b border-rule/60">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Frequently asked</div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">Questions about permit responses</h2>
        <div className="mt-8 divide-y divide-rule/60 border-y border-rule/60">
          {FAQS.map((item, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={open === i}>
                <span className="font-medium text-ink">{item.question}</span>
                <svg className={`h-4 w-4 flex-shrink-0 text-stamp transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {open === i && <p className="pb-5 text-sm leading-7 text-ink-soft">{item.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
