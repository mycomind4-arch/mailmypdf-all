import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, FileText, PackageCheck, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/resources/$slug")({
  head: () => ({ meta: [
    { title: "Guides — Appeal Mail" },
    { name: "description", content: "Guides for appealing denied claims and decisions." },
  ] }),
  component: GuidePage,
});
function GuidePage() {
  const slug = Route.useParams().slug;
  const guides: Record<string, { title: string; category: string; readTime: string; content: React.ReactNode }> = {
    "understanding-appeal-deadlines": { title: "Understanding Appeal Deadlines: Don't Miss Yours", category: "Deadlines", readTime: "5 min", content: <DeadlinesContent /> },
    "writing-an-effective-appeal-letter": { title: "Writing an Effective Appeal Letter", category: "Appeal Strategy", readTime: "6 min", content: <WritingContent /> },
    "certified-mail-for-appeals": { title: "Why Certified Mail Matters for Appeals", category: "Mailing", readTime: "4 min", content: <CertifiedContent /> },
  };
  const guide = guides[slug];
  if (!guide) return (<main className="min-h-screen bg-cream"><SiteHeader /><div className="container py-20 text-center"><h1 className="text-2xl font-bold text-indigo-700">Guide not found</h1><Link to="/resources" className="btn-outline mt-6">Back to resources</Link></div><SiteFooter /></main>);
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <article>
        <section className="bg-white py-12 md:py-16 border-b border-warm-border"><div className="container max-w-2xl">
          <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-amber-600"><ArrowLeft size={15} /> All guides</Link>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-400"><span className="font-semibold text-amber-600">{guide.category}</span><span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span></div>
          <h1 className="mt-3 text-3xl font-bold text-indigo-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>{guide.title}</h1>
        </div></section>
        <section className="py-10 md:py-14"><div className="container max-w-2xl prose-content">{guide.content}</div></section>
        <section style={{ background: "linear-gradient(135deg, var(--ink) 0%, color-mix(in oklab, var(--ink) 85%, var(--paper-deep)) 100%)" }} className="py-12"><div className="container max-w-2xl text-center"><h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Ready to appeal?</h2><p className="mt-3 text-white/60">Start a guided workflow and get your appeal in the mail today.</p><Link to="/workflows/denied-claim" className="btn-amber mt-6">Start now</Link></div></section>
      </article>
      <SiteFooter />
    </main>
  );
}
function H2({ children }: { children: React.ReactNode }) { return <h2 className="mt-10 text-xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>{children}</h2>; }
function P({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-sm leading-7 text-slate-500">{children}</p>; }
function UL({ children }: { children: React.ReactNode }) { return <ul className="mt-4 space-y-2 pl-5 text-sm text-slate-500" style={{ listStyle: "disc" }}>{children}</ul>; }
function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) { const cls = type === "warning" ? "alert alert-warning" : type === "success" ? "alert alert-success" : "alert alert-info"; return <div className={`mt-6 ${cls}`}>{children}</div>; }

function DeadlinesContent() {
  return (<><P>Appeal deadlines are the single most important factor in whether your appeal is successful. Miss the deadline, and your right to appeal may be gone forever.</P>
    <H2>Typical deadline ranges</H2>
    <UL><li><strong>Insurance appeals:</strong> 30–180 days from the denial notice</li><li><strong>Government benefits (SSA, VA):</strong> 60 days for formal appeals</li><li><strong>Court rulings:</strong> 10–30 days — very short</li><li><strong>Licensing boards:</strong> Varies widely — check your notice</li><li><strong>Reconsideration requests:</strong> May have different deadlines than formal appeals</li></UL>
    <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Critical:</strong> Count calendar days, not business days. If the deadline falls on a weekend or holiday, check whether it extends to the next business day.</Callout>
    <H2>How to protect yourself</H2>
    <UL><li>Note the deadline immediately when you receive a denial</li><li>Plan to mail at least a week before the deadline</li><li>Use certified mail with return receipt for proof of timely filing</li><li>Keep copies of everything you send</li></UL>
    <Callout type="success"><PackageCheck size={16} className="inline mr-1" /> <strong>Tip:</strong> Certified mail with return receipt gives you a signed card back — physical proof that your appeal was received on time.</Callout>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
function WritingContent() {
  return (<><P>A well-organized appeal letter can make the difference between a reversal and a denied appeal. Here's what to include and what to avoid.</P>
    <H2>What to include</H2>
    <UL><li><strong>Reference numbers:</strong> Claim number, case number, policy number, or any identifier from the denial</li><li><strong>Clear statement of what you're appealing:</strong> Don't leave the reviewer guessing</li><li><strong>Grounds for appeal:</strong> Why the decision should be reversed — factual errors, missing evidence, policy misinterpretation</li><li><strong>Supporting evidence:</strong> Reference any enclosed documents</li><li><strong>What outcome you want:</strong> Be specific about the resolution you're seeking</li></UL>
    <Callout><FileText size={16} className="inline mr-1" /> <strong>Structure:</strong> Start with the reference, state your objective, present your facts, and close with your request. Keep it professional and concise.</Callout>
    <H2>What to avoid</H2>
    <UL><li>Emotional arguments — stick to facts</li><li>Vague statements — be specific about what was wrong with the decision</li><li>Missing information — always include reference numbers</li><li>Invented facts — never fabricate or exaggerate</li></UL>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
function CertifiedContent() {
  return (<><P>When filing an appeal, proof that your submission arrived on time can be just as important as the appeal itself. Certified mail with return receipt provides that proof.</P>
    <H2>What is certified mail with return receipt?</H2>
    <P>Certified Mail provides a USPS tracking number and delivery record. The return receipt option adds a signed card that is mailed back to you as physical proof that the recipient accepted delivery.</P>
    <H2>Why it matters for appeals</H2>
    <UL><li><strong>Proof of timely filing:</strong> If a reviewer claims your appeal arrived late, your receipt proves otherwise</li><li><strong>Delivery date confirmation:</strong> The USPS record shows exactly when your appeal arrived</li><li><strong>Signature proof:</strong> The return receipt shows who signed for the delivery</li></UL>
    <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Don't rely on first-class mail alone</strong> for deadline-sensitive appeals. It lacks signature proof and a formal delivery record.</Callout>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
