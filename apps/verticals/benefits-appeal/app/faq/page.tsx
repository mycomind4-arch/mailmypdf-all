export const metadata = {
  title: 'FAQ — Benefits Appeal',
  description: 'Common questions about appealing denied government benefits with Benefits Appeal.',
}

const FAQS = [
  { q: 'Is this legal advice?', a: 'No. Benefits Appeal helps you prepare and mail correspondence. It is not a law firm and does not provide legal advice. If you need legal representation, consult an attorney or legal aid organization.' },
  { q: 'What types of denials can I appeal?', a: 'SSDI, SSI, Social Security, Medicaid, unemployment, EDD, financial aid, SAP, FAFSA, scholarship, and other government benefits denials. Each has its own workflow with specific deadlines and requirements.' },
  { q: 'How does the AI analysis work?', a: 'We analyze your denial decision to identify the denial reasons, appeal grounds, deadlines, and missing evidence. Every AI output is classified as fact, inference, unknown, rule, or recommendation. You review everything before anything is sent.' },
  { q: 'What is certified mail and why does it matter?', a: 'Certified mail provides proof of mailing and delivery. For appeal deadlines, this creates a legal record that your appeal was submitted on time. We use Lob to print, stamp, and mail your documents with tracking.' },
  { q: 'Do you guarantee my appeal will succeed?', a: 'No. We help you prepare a well-organized, evidence-backed appeal and prove it was mailed. The outcome depends on the agency, the evidence, and the merits of your case.' },
  { q: 'How much does it cost?', a: 'Each workflow has a preparation fee ($29.99–$69.99 depending on complexity) plus mailing costs ($4.99 standard, $14.94 certified, $32.49 registered). There are no subscription fees.' },
  { q: 'What about deadlines?', a: 'Appeal deadlines vary by program and jurisdiction. We extract deadlines from your denial letter when available. Always verify the deadline independently — missing an appeal deadline can forfeit your rights.' },
  { q: 'Is my data secure?', a: 'Your documents are encrypted, access-controlled, and audit-logged. We never share your data with third parties. Proof packets are sealed and permanently archived for your records.' },
]

export default function FAQPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
        Frequently Asked Questions
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
        Everything you need to know about appealing denied benefits.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {FAQS.map((faq) => (
          <details key={faq.q} style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '0.625rem',
            padding: '1.25rem 1.5rem',
          }}>
            <summary style={{
              cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
              color: '#f8fafc', listStyle: 'none',
            }}>
              {faq.q}
            </summary>
            <p style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <p style={{
        marginTop: '2rem', padding: '1rem', textAlign: 'center',
        fontSize: '0.8rem', color: '#475569',
        background: 'rgba(15,23,42,0.4)', borderRadius: '0.5rem',
      }}>
        Benefits Appeal is not a law firm and does not provide legal advice.
        If you need legal representation, consult an attorney or legal aid organization.
      </p>
    </div>
  )
}
