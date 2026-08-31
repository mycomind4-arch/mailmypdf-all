import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/resources/")({
  head: () => ({ meta: [
    { title: "Resources & Guides — Dispute Mail" },
    { name: "description", content: "Guides for disputing credit report errors, debt validation, and billing issues." },
  ] }),
  component: ResourcesIndex,
});
const guides = [
  { slug: "fcra-credit-disputes", title: "FCRA Credit Disputes: Your Rights Explained", excerpt: "The Fair Credit Reporting Act gives you the right to dispute inaccurate information. Here's how it works.", readTime: "5 min", category: "Credit Disputes", icon: "📋" },
  { slug: "fdcpa-debt-validation", title: "FDCPA Debt Validation: The 30-Day Rule", excerpt: "You have 30 days from first contact to request debt validation. Here's what to include and why proof matters.", readTime: "4 min", category: "Debt Validation", icon: "⚖️" },
  { slug: "medical-billing-disputes", title: "How to Dispute a Medical Billing Error", excerpt: "Medical billing errors are common. Here's what to look for and how to dispute charges effectively.", readTime: "5 min", category: "Billing Disputes", icon: "🏥" },
];
function ResourcesIndex() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16 md:py-20 border-b border-warm-border"><div className="container max-w-2xl">
        <div className="eyebrow">Resources</div>
        <h1 className="mt-3 text-4xl font-bold text-teal-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Guides for your disputes</h1>
        <p className="mt-4 text-slate-400">Practical, plain-language guides about disputing credit errors, debt, and billing issues. Not legal advice.</p>
      </div></section>
      <section className="py-12 md:py-16"><div className="container max-w-4xl"><div className="grid gap-5">
        {guides.map((guide) => (<Link key={guide.slug} to="/resources/$slug" params={{ slug: guide.slug }} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start gap-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xl">{guide.icon}</div>
          <div className="flex-1"><div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-semibold text-rose-600">{guide.category}</span><span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span></div>
          <h2 className="mt-2 text-xl font-semibold text-teal-700 group-hover:text-rose-600 transition-colors" style={{ fontFamily: "var(--font-serif)" }}>{guide.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-600">Read guide <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </div></div>
        </Link>))}
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-warm-border bg-white p-6 text-center"><BookOpen size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-400">More guides are being written. Have a topic? Let us know at <span className="font-semibold text-rose-600">support@disputemail.app</span>.</p></div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
