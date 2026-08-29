import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/resources/")({
  head: () => ({ meta: [
    { title: "Resources & Guides — Benefits Appeal" },
    { name: "description", content: "Guides for appealing denied claims, government decisions, and court rulings." },
  ] }),
  component: ResourcesIndex,
});
const guides = [
  { slug: "understanding-appeal-deadlines", title: "Understanding Appeal Deadlines: Don't Miss Yours", excerpt: "Appeal deadlines can be very short. Here's what to know about deadlines for insurance, government, and court appeals.", readTime: "5 min", category: "Deadlines", icon: "⏰" },
  { slug: "writing-an-effective-appeal-letter", title: "Writing an Effective Appeal Letter", excerpt: "A clear, well-organized appeal letter can make the difference. Here's what to include and what to avoid.", readTime: "6 min", category: "Appeal Strategy", icon: "✍️" },
  { slug: "certified-mail-for-appeals", title: "Why Certified Mail Matters for Appeals", excerpt: "Proof of timely filing can be the difference between a successful appeal and a dismissed one.", readTime: "4 min", category: "Mailing", icon: "📮" },
];
function ResourcesIndex() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16 md:py-20 border-b border-warm-border"><div className="container max-w-2xl">
        <div className="eyebrow">Resources</div>
        <h1 className="mt-3 text-4xl font-bold text-indigo-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Guides for your appeals</h1>
        <p className="mt-4 text-slate-400">Practical, plain-language guides about appealing denied claims and decisions. Not legal advice.</p>
      </div></section>
      <section className="py-12 md:py-16"><div className="container max-w-4xl"><div className="grid gap-5">
        {guides.map((guide) => (<Link key={guide.slug} to="/resources/$slug" params={{ slug: guide.slug }} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start gap-5"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">{guide.icon}</div>
          <div className="flex-1"><div className="flex items-center gap-3 text-xs text-slate-400"><span className="font-semibold text-amber-600">{guide.category}</span><span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span></div>
          <h2 className="mt-2 text-xl font-semibold text-indigo-700 group-hover:text-amber-600 transition-colors" style={{ fontFamily: "var(--font-serif)" }}>{guide.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{guide.excerpt}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-600">Read guide <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </div></div>
        </Link>))}
      </div>
      <div className="mt-10 rounded-xl border border-dashed border-warm-border bg-white p-6 text-center"><BookOpen size={24} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-400">More guides are being written. Have a topic? Let us know at <span className="font-semibold text-amber-600">support@appealmail.app</span>.</p></div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
