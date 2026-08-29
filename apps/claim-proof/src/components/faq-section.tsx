import { useState } from 'react'

interface FAQItem { question: string; answer: string }

const FAQS: FAQItem[] = [
  {
    question: "What is Claim Proof?",
    answer: "Claim Proof is a document and correspondence tool that helps you respond to claim denials — insurance, benefits, disability, unemployment, and more. You upload the denial letter, the system extracts the key facts, deadlines, and evidence requirements, and you prepare a documented response with supporting proof. The response is mailed via certified mail with tracking and delivery confirmation.",
  },
  {
    question: "How long do I have to respond to a claim denial?",
    answer: "Most claim denials include an appeal deadline, typically 30 to 90 days. The deadline varies by claim type and jurisdiction. Insurance denials often allow 30 to 60 days for appeal. SSDI and SSI denials give 60 days. Unemployment denials vary by state. The deadline is printed on your denial letter — do not wait to respond.",
  },
  {
    question: "What should I include in my claim appeal?",
    answer: "Your appeal should address each reason for denial stated in the letter. Include supporting documentation such as medical records, policy language, correspondence, photographs, expert opinions, or payment records. Explain why the denial is incorrect and cite the specific policy provision or law that supports your claim. Be factual, specific, and organized.",
  },
  {
    question: "Does Claim Proof provide legal advice?",
    answer: "No. Claim Proof is a document and correspondence tool, not a law firm or claims adjuster. It helps you organize your facts, prepare a written response, and mail it with proof of delivery. For complex claims involving significant amounts or legal rights, consider consulting a licensed attorney in your jurisdiction.",
  },
  {
    question: "What happens if I miss the appeal deadline?",
    answer: "Missing the appeal deadline can result in the denial becoming final, meaning you lose the right to challenge the decision through the normal appeals process. Some jurisdictions allow late appeals for good cause, but this is not guaranteed. If your deadline has passed, respond as soon as possible and explain the delay — some agencies and insurers will still consider a late appeal.",
  },
  {
    question: "Can I send my appeal with tracking?",
    answer: "Yes. Certified mail with return receipt is the recommended method for sending a claim appeal. It provides proof of mailing and proof of delivery — your record that the appeal was submitted on time. Claim Proof offers certified mail as a mailing option, with tracking and delivery confirmation included.",
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="border-b border-rule/60">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Frequently asked</div>
        <h2 className="mt-3 font-serif text-3xl leading-tight">Questions about claim appeals</h2>
        <div className="mt-8 divide-y divide-rule/60 border-y border-rule/60">
          {FAQS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="font-medium text-ink">{item.question}</span>
                <svg className={`h-4 w-4 flex-shrink-0 text-stamp transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <p className="pb-5 text-sm leading-7 text-ink-soft">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
