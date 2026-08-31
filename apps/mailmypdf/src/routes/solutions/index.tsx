import { createFileRoute, Link } from "@tanstack/react-router";
import { getVerticalsByCategoryForNav, type VerticalDefinition } from "@/verticals";
import { SiteFooter } from "@/components/site-chrome";
import { SiteHeader as SiteHeaderV2 } from "@/components/site-chrome";

export const Route = createFileRoute("/solutions/")({
  head: () => ({
    meta: [
      { title: "Document Response Solutions | MailMyPDF" },
      { name: "description", content: "Explore MailMyPDF's existing document workflows for notices, appeals, disputes, records requests, housing, claims, and other important correspondence. Next-generation replacements are organized in the MailMyPDF Ecosystem." },
      { property: "og:title", content: "Document Response Solutions | MailMyPDF" },
      { property: "og:description", content: "Existing workflows for important correspondence, with next-generation products rolling out through the MailMyPDF Ecosystem." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/solutions" }],
  }),
  component: SolutionsPage,
});

function SolutionsPage() {
  const categories = getVerticalsByCategoryForNav();
  const allVerticals = categories.flatMap((g) => g.verticals);

  return <div className="min-h-screen"><SiteHeaderV2 /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className="postmark mx-auto w-fit">Existing workflows</div>
      <h1 className="mt-6 text-4xl leading-tight sm:text-5xl md:text-6xl font-serif">Start with the problem you need to solve.</h1>
      <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-ink-soft">These are the established MailMyPDF workflows currently available. As each advanced replacement becomes ready, the Ecosystem becomes the preferred destination for that category.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/ecosystem" className="inline-flex items-center rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white">Explore the new Ecosystem →</Link><Link to="/send" className="inline-flex items-center rounded-full border border-rule px-6 py-3 text-sm font-medium">Upload a document</Link></div>
    </div></section>
    <section className="border-b border-rule/60 bg-paper-deep/20"><div className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="grid gap-4 sm:grid-cols-3 text-center"><div><div className="font-serif text-2xl text-cobalt">1</div><div className="mt-1 text-sm font-medium">Understand</div><div className="mt-1 text-xs text-muted-foreground">Start with the situation and documents you actually have.</div></div><div><div className="font-serif text-2xl text-cobalt">2</div><div className="mt-1 text-sm font-medium">Prepare</div><div className="mt-1 text-xs text-muted-foreground">Organize facts, evidence, dates, and the response.</div></div><div><div className="font-serif text-2xl text-cobalt">3</div><div className="mt-1 text-sm font-medium">Send &amp; prove</div><div className="mt-1 text-xs text-muted-foreground">Print, mail, track, and preserve the mailing record.</div></div></div></div></section>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"><div className="mb-10 text-center"><h2 className="text-3xl font-semibold sm:text-4xl">Current solutions</h2><p className="mt-2 text-sm text-muted-foreground">Established workflows remain available while their next-generation replacements are developed.</p></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{allVerticals.map((v) => <VerticalCard key={v.id} vertical={v} />)}</div></div></section>
    <section className="border-t border-rule/60 bg-paper-deep/30"><div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20"><div className="postmark mx-auto w-fit">Next generation</div><h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl">The newer products live in the Ecosystem.</h2><p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-ink-soft">Each new master vertical can own an entire family of specific search intents and sub-workflows without duplicating the MailMyPDF foundation.</p><Link to="/ecosystem" className="mt-8 inline-flex items-center rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white">Browse master verticals →</Link></div></section>
    <section className="border-t border-rule/60"><div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20"><h2 className="text-2xl sm:text-3xl md:text-4xl">Already have the final document?</h2><p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-ink-soft">Skip the workflow. Upload the final document and start the mailing process.</p><Link to="/send" className="mt-8 inline-flex items-center rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white">Send your document →</Link></div></section>
  </main><SiteFooter /></div>;
}

const ICON_PATHS: Record<string, string> = { Landmark:"M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6", Scale:"M12 3v18M5 7l-3 7h6L5 7zm14 0l-3 7h6l-3-7zM5 7h14M8 21h8", Clock:"M12 6v6l4 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z", ShieldAlert:"M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM12 8v4M12 16h.01", FileCheck:"M9 12l2 2 4-4M5 3h14v18l-7-3-7 3V3z", Home:"M3 12l9-9 9 9M5 10v10h14V10", FileText:"M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4", HeartPulse:"M3 12h3l3-8 3 16 3-8h6", ShieldCheck:"M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4zM9 12l2 2 4-4", FolderOpen:"M3 7l2-2h5l2 2h7v12H3V7z" };

function VerticalCard({ vertical }: { vertical: VerticalDefinition }) {
  const iconPath = ICON_PATHS[vertical.icon] ?? ICON_PATHS.FileText;
  const isExternal = vertical.route.startsWith("http");
  const className = "group flex flex-col rounded-lg border border-rule bg-card p-6 transition-all hover:border-ink/30 hover:shadow-md";
  const inner = <>
    <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper-deep"><svg className="h-6 w-6 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={iconPath} /></svg></span><div className="min-w-0"><h3 className="text-lg font-semibold text-foreground">{vertical.name}</h3><p className="text-xs text-muted-foreground">{vertical.tagline}</p></div></div>
    <p className="mt-4 flex-1 text-sm text-muted-foreground">{vertical.description}</p>
    <div className="mt-5 flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-sm font-medium text-cobalt transition-colors group-hover:text-foreground">{vertical.primaryCTA}<span aria-hidden>→</span></span>{vertical.status !== "live" && <span className="rounded border border-rule px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Preview</span>}</div>
  </>;
  return isExternal ? <a href={vertical.route} className={className}>{inner}</a> : <Link to={vertical.route} className={className}>{inner}</Link>;
}
