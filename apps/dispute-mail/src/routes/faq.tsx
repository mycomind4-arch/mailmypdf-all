import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [
    { title: "FAQ — Dispute Mail" },
    { name: "description", content: "Answers to common questions about Dispute Mail: how it works, mailing, privacy, legal scope, and pricing." },
  ] }),
  component: FAQPage,
});
const categories = [
  { name: "Using Dispute Mail", questions: [
    { q: "Is this legal advice?", a: "No. Dispute Mail is a correspondence tool, not a law firm. We help you prepare and send dispute documents — we do not provide legal advice, and the AI assistant never invents facts or legal conclusions." },
    { q: "What types of issues can I dispute?", a: "Credit report errors with Equifax, Experian, or TransUnion; debt validation requests to collectors; medical and utility billing errors; and unauthorized charges with your card issuer or bank." },
    { q: "How does the drafting work?", a: "You provide your facts and objective in your own words. The AI assistant organizes that information into a professional draft. Everything is editable, and the AI never invents facts." },
    { q: "Do I need to review the draft?", a: "Yes. Before anything is mailed, you must confirm a review checklist and approve the final document." },
    { q: "Can I edit the draft?", a: "Absolutely. The draft is fully editable — change anything, add paragraphs, or start over." },
  ]},
  { name: "Mailing & Delivery", questions: [
    { q: "How does physical mail work?", a: "Your final document is printed, placed in a business envelope, and mailed via USPS. You never need a printer." },
    { q: "How long does delivery take?", a: "First-class mail typically arrives in 3–5 business days." },
    { q: "Can I track my letter?", a: "Yes. Every mailing includes a USPS tracking number. Certified mail adds signature tracking." },
    { q: "What's proof of timely submission?", a: "Certified mail with return receipt provides a USPS delivery record and a signed card mailed back to you as physical proof." },
  ]},
  { name: "Privacy & Security", questions: [
    { q: "Is my data secure?", a: "All documents and personal information are stored with encryption. We never sell your data or use it for marketing." },
    { q: "Can I delete my data?", a: "Yes. You can request full deletion at any time." },
    { q: "Do you train AI on my data?", a: "No. We never use your documents or correspondence content to train AI models." },
  ]},
  { name: "Legal & Scope", questions: [
    { q: "Is Dispute Mail a law firm?", a: "No. Dispute Mail is a document preparation and mailing service. We do not provide legal advice or representation." },
    { q: "Can this replace an attorney?", a: "No. If your dispute involves complex legal questions, consult a qualified attorney." },
  ]},
];
function FAQPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16 md:py-20"><div className="container">
        <div className="mx-auto max-w-2xl text-center"><div className="eyebrow">Questions</div>
        <h1 className="mt-3 text-4xl font-bold text-teal-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Frequently asked questions</h1>
        <p className="mt-4 text-slate-400">Everything you need to know about how Dispute Mail works.</p></div>
      </div></section>
      <section className="py-12 md:py-16"><div className="container max-w-3xl">
        {categories.map((cat) => (<div key={cat.name} className="mb-10">
          <h2 className="text-xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{cat.name}</h2>
          <div className="mt-4 space-y-3">{cat.questions.map((item) => (<FAQItem key={item.q} q={item.q} a={item.a} />))}</div>
        </div>))}
      </div></section>
      <SiteFooter />
    </main>
  );
}
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (<div className="card overflow-hidden"><button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setOpen(!open)}><span className="font-semibold text-teal-700">{q}</span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div className="px-5 pb-5 text-sm leading-6 text-slate-400">{a}</div>}</div>);
}
