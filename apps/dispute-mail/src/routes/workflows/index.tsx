import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { workflows } from "@/domain/workflows";

const SITE_ORIGIN = "https://dispute-mail.pages.dev";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Dispute Workflows | Credit, Debt & Billing | Dispute Mail" },
      { name: "description", content: "Browse all Dispute Mail workflows for credit report disputes, debt validation, billing errors, unauthorized charges, and follow-up escalations." },
      { property: "og:title", content: "Dispute Workflows | Credit, Debt & Billing | Dispute Mail" },
      { property: "og:description", content: "Browse all Dispute Mail workflows for credit report disputes, debt validation, billing errors, and unauthorized charges." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Dispute Mail" },
      { property: "og:url", content: "https://dispute-mail.pages.dev/workflows" },
      // TODO: Create /og-image.png (1200x630) — no OG image asset exists yet
      { property: "og:image", content: "https://dispute-mail.pages.dev/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dispute Workflows | Dispute Mail" },
      { name: "twitter:description", content: "Browse all Dispute Mail workflows for credit report disputes, debt validation, billing errors, and unauthorized charges." },
      { name: "twitter:image", content: "https://dispute-mail.pages.dev/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://dispute-mail.pages.dev/workflows" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Dispute Mail Workflows",
          itemListElement: groups.flatMap((g) => g.ids).map((id, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: workflows[id as keyof typeof workflows]?.title ?? id,
            url: SITE_ORIGIN + "/workflows/" + id,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://dispute-mail.pages.dev/" },
            { "@type": "ListItem", position: 2, name: "Workflows", item: "https://dispute-mail.pages.dev/workflows" },
          ],
        }),
      },
    ],
  }),
  component: WorkflowDirectory,
});

const groups = [
  { title: "Debt & collection disputes", ids: ["debt-collection-dispute", "dispute-collection-agency", "debt-dispute", "debt-validation", "medical-collections", "cease-contact", "fdcpa-dispute", "debt-lawsuit-response"] },
  { title: "Credit report disputes", ids: ["credit-report", "credit-report-collections", "hard-inquiry", "charge-off", "student-loan", "transunion-dispute", "experian-dispute", "equifax-dispute", "lexisnexis-dispute", "fcra-dispute"] },
  { title: "Billing & transaction disputes", ids: ["credit-card-billing", "unauthorized-charge", "billing-error", "subscription-billing", "service-contract", "insurance-billing"] },
  { title: "Follow-up & escalation", ids: ["follow-up-no-response", "inadequate-response"] },
] as const;

const PLACEHOLDER_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png";

function WorkflowDirectory() {
  const [query, setQuery] = useState("");
  const all = groups.flatMap((group) => group.ids.map((id) => ({ group: group.title, id, workflow: workflows[id as keyof typeof workflows], profile: workflowProfiles[id as keyof typeof workflowProfiles] }))).filter((item) => item.workflow);
  const filtered = useMemo(() => all.filter((item) => `${item.id} ${item.workflow.title} ${item.workflow.description} ${item.profile?.primaryKeyword ?? ""}`.toLowerCase().includes(query.toLowerCase())), [all, query]);

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="border-b border-warm-border bg-teal-50 py-16 md:py-24"><div className="container max-w-5xl"><div className="eyebrow">DISPUTE MAIL WORKFLOW DIRECTORY</div><h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold leading-tight text-teal-700 md:text-6xl">Find the workflow that matches the exact problem.</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-500">Search by what happened, what appears on the account or statement, the organization involved, or the outcome you need to challenge.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search disputes — debt, credit report, billing, collections…" className="w-full rounded-full border border-warm-border bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10" aria-label="Search dispute workflows" /></div><Link to="/workflows/credit-report" className="btn-rose">Start with a credit dispute <ArrowRight size={18} /></Link></div><div className="mt-3 font-mono text-xs text-slate-400">{filtered.length} workflows · AI handles the research and organization underneath</div></div></section>
      <section className="container py-16 md:py-24"><div className="space-y-14">{groups.map((group) => { const items = filtered.filter((item) => item.group === group.title); if (!items.length) return null; return <div key={group.title}><div className="max-w-2xl"><div className="eyebrow">{group.title}</div><p className="mt-2 text-slate-400">Problem-specific workflows with focused evidence, review, and mailing paths.</p></div><div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map(({ id, workflow, profile }) => <Link key={id} to="/workflows/$workflowId" params={{ workflowId: id }} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-warm-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[16/9] overflow-hidden"><img src={PLACEHOLDER_IMAGE} alt="" aria-hidden="true" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" /><div className="absolute bottom-3 left-4 rounded-full bg-slate-900/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">{group.title}</div></div><div className="flex flex-1 flex-col p-5"><div className="flex h-9 w-fit items-center gap-2 rounded-full border border-warm-border bg-cream px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500"><FileText size={12} /> Workflow</div><h2 className="mt-4 font-serif text-[1.55rem] leading-[1.12] text-teal-700">{workflow.title}</h2><p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{workflow.description}</p><div className="mt-5 border-t border-warm-border pt-4"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Search intent</div><div className="mt-1.5 text-xs leading-5 text-slate-600">{profile?.primaryKeyword || "Specialized dispute response"}</div></div><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-600">View workflow <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span></div></Link>)}</div></div>})}</div></section><SiteFooter />
    </main>
  );
}
