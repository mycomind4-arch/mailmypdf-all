import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "FAQ — Notice Respond" },
    { name: "description", content: "Answers to common questions about Notice Respond." },
  ] }),
  component: FAQPage,
});

const categories = [
  { name: "Using Notice Respond", questions: [
    { q: "Is this legal advice?", a: "No. Notice Respond is a correspondence tool, not a law firm, CPA firm, or government agency. We help you prepare and send documents — we do not provide legal or tax advice, and the AI assistant never invents facts or legal conclusions." },
    { q: "What types of notices can I respond to?", a: "IRS notices and letters, court summonses and complaints, regulatory agency actions, licensing board decisions, FOIA determinations, and appeals of denied claims or rulings." },
    { q: "How does the drafting work?", a: "You provide your facts and objective in your own words. The AI assistant organizes that information into a professional draft. Everything is editable, and the AI never invents facts." },
    { q: "Do I need to review the draft?", a: "Yes. Before anything is mailed, you must confirm a review checklist and approve the final document." },
    { q: "Can I edit the draft?", a: "Absolutely. The draft is fully editable — change anything, add paragraphs, or start over." },
  ]},
  { name: "Mailing & Delivery", questions: [
    { q: "How does physical mail work?", a: "Your final document is printed, placed in a business envelope, and mailed via USPS. You never need a printer." },
    { q: "How long does delivery take?", a: "Standard mail typically arrives in 3–7 business days. Certified follows the same timeline with added tracking." },
    { q: "Can I track my letter?", a: "Yes. Every mailing includes a USPS tracking number. Certified mail adds signature tracking and proof of delivery." },
    { q: "What's proof of timely submission?", a: "Certified mail provides a USPS delivery record — your proof that the response was mailed on time." },
  ]},
  { name: "Privacy & Security", questions: [
    { q: "Is my data secure?", a: "All documents and personal information are stored with encryption. We never sell your data or use it for marketing." },
    { q: "Can I delete my data?", a: "Yes. You can request full deletion at any time." },
    { q: "Do you train AI on my data?", a: "No. We never use your documents or correspondence content to train AI models." },
  ]},
  { name: "Legal & Scope", questions: [
    { q: "Is Notice Respond a law firm?", a: "No. Notice Respond is a document preparation and mailing service. We do not provide legal advice or representation." },
    { q: "Can this replace an attorney?", a: "No. If your case involves complex legal questions, consult a qualified attorney." },
  ]},
];

function FAQPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-6 py-20">
          <div className="postmark w-fit">FAQ</div>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl">Frequently asked questions</h1>
          <p className="mt-4 text-muted-foreground">Everything you need to know about how Notice Respond works.</p>
        </div></section>
        <section className="border-b border-rule/60"><div className="mx-auto max-w-3xl px-6 py-16">
          {categories.map((cat) => (
            <div key={cat.name} className="mb-10">
              <h2 className="font-serif text-xl">{cat.name}</h2>
              <div className="mt-4 divide-y divide-rule/70 border-y border-rule/70">
                {cat.questions.map((item) => (<details key={item.q} className="group py-5"><summary className="flex cursor-pointer items-center justify-between list-none"><span className="font-serif text-lg">{item.q}</span><span className="text-stamp transition-transform group-open:rotate-45">＋</span></summary><p className="mt-3 text-muted-foreground">{item.a}</p></details>))}
              </div>
            </div>
          ))}
        </div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
