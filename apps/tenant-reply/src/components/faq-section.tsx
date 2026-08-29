import { useState } from 'react'

interface FAQItem { question: string; answer: string }

const FAQS: FAQItem[] = [
  {
    question: "What is Tenant Reply?",
    answer: "Tenant Reply is a document and correspondence tool that helps tenants respond to landlord notices — eviction notices, pay-or-quit, cure-or-quit, lease violations, repair demands, habitability complaints, and security deposit disputes. You upload the notice, the system extracts the key facts, deadlines, and legal requirements, and you prepare a documented response. The response is mailed via certified mail with tracking and delivery confirmation.",
  },
  {
    question: "How long do I have to respond to an eviction notice?",
    answer: "Eviction notice response deadlines vary by state and notice type. A 3-day pay-or-quit typically gives 3 days to pay or respond. A 30-day or 60-day termination notice gives you that period to respond or vacate. Some states require a written response before the landlord can file an unlawful detainer. The deadline is on the notice — do not wait. Tenant Reply helps you identify and meet the deadline, but does not provide legal advice.",
  },
  {
    question: "What should I include in my response to a landlord notice?",
    answer: "Your response should address each issue raised in the notice. For a pay-or-quit, state whether you are paying, disputing the amount, or requesting time. For a cure-or-quit, explain how you have corrected the violation or dispute the allegation. For a repair demand, describe the habitability issue and request specific repairs. Include relevant documentation such as lease terms, correspondence, photos, repair requests, and payment records.",
  },
  {
    question: "Does Tenant Reply provide legal advice?",
    answer: "No. Tenant Reply is a document and correspondence tool, not a law firm or tenant advocacy organization. It helps you organize your facts, prepare a written response, and mail it with proof of delivery. Eviction and housing law varies significantly by state and jurisdiction. For matters involving eviction proceedings, consult a tenant rights attorney or local legal aid organization.",
  },
  {
    question: "What happens if I don't respond to a landlord notice?",
    answer: "Failing to respond to a landlord notice can have serious consequences. For eviction notices, non-response can lead to an unlawful detainer filing and a default judgment against you. For repair demands, non-response may be used to argue you waived the issue. For lease violations, non-response may be treated as acceptance. Always respond in writing and keep proof of your response — certified mail provides that proof.",
  },
  {
    question: "Can I send my tenant response with tracking?",
    answer: "Yes. Certified mail with return receipt is the recommended method for sending a tenant response. It provides proof of mailing and proof of delivery — your record that the response was submitted on time. Tenant Reply offers certified mail as a mailing option, with tracking and delivery confirmation included.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="border-b border-rule/60">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Frequently asked</div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">Questions about tenant responses</h2>
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
