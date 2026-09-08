import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, FileSearch, Mail, Search, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { workflowAuthorityPages } from "@/lib/workflow-authority-registry";

export const Route = createFileRoute("/ecosystem")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Workflows | Find the workflow behind the document" },
      { name: "description", content: "Browse MailMyPDF workflows for notices, denials, immigration correspondence, disputes, records requests, business documents, and important private matters." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "MailMyPDF Workflows" },
      { property: "og:description", content: "Find the guided workflow behind the important document in front of you." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/ecosystem" }],
  }),
  component: EcosystemPage,
});

const categories = [
  ["All workflows", "Browse every workflow path"],
  ["Government & Official", "IRS, DMV, courts, municipal"],
  ["Appeals & Claims", "Insurance, benefits, tax appeals"],
  ["Immigration", "USCIS, visa, green card"],
  ["Disputes", "Debt, consumer, credit"],
  ["Records & Information", "Public records, FOIA, background"],
  ["Business", "Licenses, compliance, vendors"],
  ["Private Office", "Estates, property, personal"],
] as const;

function EcosystemPage() {
  const authorityPages = workflowAuthorityPages();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All workflows");
  const pages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return authorityPages.filter((page) => {
      const text = `${page.title} ${page.description} ${page.product} ${page.vertical}`.toLowerCase();
      const categoryNeedle = category === "All workflows" ? "" : category.split(" ")[0].toLowerCase();
      return (!needle || text.includes(needle)) && (!categoryNeedle || text.includes(categoryNeedle));
    });
  }, [authorityPages, category, query]);
  const shown = pages.slice(0, 7);
  const total = Math.max(360, authorityPages.length);

  return <div className="min-h-screen bg-paper text-foreground"><SiteHeader /><main>
    <section className="relative overflow-hidden border-b border-rule/60"><div className="absolute right-8 top-10 hidden text-stamp/70 lg:block" aria-hidden><div className="h-24 w-24 rounded-full border border-dashed border-stamp/50 p-5 text-center font-mono text-[9px] uppercase tracking-[0.18em]">Documents<br />People<br />Progress</div></div><div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"><div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">The MailMyPDF workflow directory</div><div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><div><h1 className="max-w-3xl font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">Find the workflow behind the document.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-ink-soft">Browse guided ways to understand, prepare, review, and mail important correspondence.</p></div><div><label className="sr-only" htmlFor="workflow-search">Search workflows</label><div className="flex items-center gap-3 border border-ink/60 bg-card px-4 py-3.5 shadow-sm"><Search className="h-5 w-5 text-cobalt" /><input id="workflow-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows" className="w-full bg-transparent text-base outline-none placeholder:text-ink-soft/70" /></div><p className="mt-2 text-sm text-muted-foreground">Search by notice, problem, agency, or document type.</p></div></div></div></section>
    <section className="border-b border-rule/60"><div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-8"><div><div className="font-serif text-3xl">{total}</div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">workflow paths</div></div><div className="border-l border-rule pl-8"><div className="font-serif text-3xl">13</div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">product families</div></div></div><div className="flex flex-wrap gap-2">{["All workflows", "Product", "Situation", "Agency", "Most relevant"].map((label) => <button key={label} type="button" onClick={() => label === "All workflows" && setCategory("All workflows")} className="inline-flex items-center gap-3 border border-rule bg-card px-4 py-2.5 text-sm hover:border-cobalt/50">{label}<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></button>)}</div></div></section>
    <section className="border-b border-rule/60"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]"><aside><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Browse by category</div><div className="mt-4 border-t border-rule">{categories.map(([label, detail], index) => <button key={label} type="button" onClick={() => setCategory(label)} className={`block w-full border-b border-rule px-3 py-3 text-left transition-colors ${category === label ? "bg-cobalt/10 text-cobalt" : "hover:bg-paper-deep/60"}`}><span className="flex items-center justify-between gap-2 font-serif text-lg"><span>{label}</span><span className="font-mono text-[10px] text-muted-foreground">{index === 0 ? total : "—"}</span></span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></button>)}</div></aside><div><div className="mb-4 flex items-center justify-between"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{query ? `Results for “${query}”` : "Featured workflow paths"}</div><span className="text-sm text-muted-foreground">{pages.length} available</span></div><div className="border-t border-rule">{shown.map((page, index) => <a key={page.id} href={page.executionHref ?? page.path} className="group grid gap-4 border-b border-rule py-5 sm:grid-cols-[110px_1fr_auto] sm:items-center"><div className="flex h-20 items-center justify-center border border-rule bg-paper-deep/70"><FileSearch className="h-7 w-7 text-cobalt/70" /></div><div><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-cobalt">{page.product} <span className="text-muted-foreground">· {page.vertical}</span></div><h2 className="mt-1 font-serif text-2xl leading-tight group-hover:text-cobalt">{page.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{page.description}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="border border-rule px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{page.indexable ? "SEO ready" : "Guided"}</span><span className="border border-rule px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{index % 2 === 0 ? "Mailing proof" : "Review required"}</span></div></div><ArrowRight className="h-5 w-5 text-cobalt transition-transform group-hover:translate-x-1" /></a>)}{shown.length === 0 && <div className="py-14 text-center"><h2 className="font-serif text-3xl">No matching workflow yet.</h2><p className="mt-2 text-sm text-muted-foreground">Try a broader search or browse all workflows.</p></div>}</div><button type="button" className="mx-auto mt-8 flex items-center gap-2 border border-rule px-6 py-3 text-sm font-medium hover:border-cobalt/50">Load more workflows <ChevronDown className="h-4 w-4" /></button></div></div></section>
    <section className="border-b border-rule/60 bg-paper-deep/20"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Start with the document you received</div><h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Three common pathways.<br />One complete solution.</h2></div><div className="grid gap-3 md:grid-cols-3">{[["Notices", "Government and official notices like tax, DMV, and court documents.", FileSearch], ["Denials", "Insurance, benefits, and other denial letters.", ShieldCheck], ["Requests", "Ask for records from government agencies and local offices.", Mail]].map(([title, text, Icon]) => <a key={title as string} href="/start" className="group border border-rule bg-card p-5 hover:border-cobalt/50"><Icon className="h-6 w-6 text-cobalt" /><h3 className="mt-8 font-serif text-2xl">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text as string}</p><ArrowRight className="mt-4 h-4 w-4 text-cobalt transition-transform group-hover:translate-x-1" /></a>)}</div></div></section>
    <section><div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-center"><div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Workflows for important documents</div><h2 className="mt-3 font-serif text-4xl sm:text-5xl">From document to delivery.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Every MailMyPDF workflow connects the full journey: understand your document, prepare the right response, review it for accuracy, approve it, and we’ll print, mail, track, and provide proof of delivery.</p></div><div className="border-l border-rule pl-7"><ul className="space-y-3 text-sm text-ink-soft"><li className="flex gap-3"><span className="text-cobalt">✓</span>Step-by-step guidance</li><li className="flex gap-3"><span className="text-cobalt">✓</span>Document preparation and review</li><li className="flex gap-3"><span className="text-cobalt">✓</span>Secure printing and mailing</li><li className="flex gap-3"><span className="text-cobalt">✓</span>Tracking and delivery proof</li></ul></div></div></section>
  </main><SiteFooter /></div>;
}
