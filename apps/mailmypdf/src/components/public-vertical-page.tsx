import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSearch,
  FolderSearch2,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { workflowAuthorityPages, type WorkflowAuthorityPageData } from "@/lib/workflow-authority-registry";
import {
  categoryForWorkflow,
  publicVerticalById,
  type PublicVerticalConfig,
  type PublicVerticalId,
} from "@/lib/public-verticals";

function pagesFor(config: PublicVerticalConfig): WorkflowAuthorityPageData[] {
  return workflowAuthorityPages().filter((page) => config.verticalKeys.includes(page.vertical));
}

function pageStatus(page: WorkflowAuthorityPageData): string {
  if (page.executionHref) return "Workflow available";
  if (page.indexable) return "Authority guide";
  return "Guide in review";
}

export function publicVerticalHead(id: PublicVerticalId, kind: "landing" | "directory" = "landing") {
  const config = publicVerticalById(id);
  if (!config) return {};
  const title = kind === "directory" ? `${config.product} Workflows | MailMyPDF` : `${config.product} | MailMyPDF`;
  const description = kind === "directory" ? config.directoryDescription : config.description;
  const canonical = kind === "directory" ? `${config.path}/workflows` : config.path;
  const itemList = kind === "directory"
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${config.product} workflows`,
        itemListElement: pagesFor(config).map((page, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: page.title,
          url: page.path,
        })),
      }
    : null;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: itemList ? [{ type: "application/ld+json", children: JSON.stringify(itemList) }] : [],
  };
}

export function PublicVerticalLandingPage({ id }: { id: PublicVerticalId }) {
  const config = publicVerticalById(id);
  if (!config) return null;
  const pages = pagesFor(config);
  const featured = pages.slice(0, 6);

  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main>
        <section className="relative min-h-[34rem] overflow-hidden border-b border-rule/60 bg-ink">
          <div className="absolute inset-0 bg-cover bg-center" aria-hidden style={{ backgroundImage: "url(/hero-document.jpg)" }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,20,35,0.92)_0%,rgba(5,20,35,0.7)_42%,rgba(5,20,35,0.2)_100%),linear-gradient(0deg,rgba(5,20,35,0.72)_0%,transparent_48%)]" aria-hidden />
          <div className="relative mx-auto flex min-h-[34rem] max-w-6xl items-end px-4 pb-14 pt-20 sm:px-6 sm:pb-16 lg:pb-20">
            <div className="max-w-2xl text-white">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{config.eyebrow}</div>
              <h1 className="mt-5 font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{config.heroTitle}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">{config.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`${config.path}/workflows`} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-ink shadow-lg transition hover:-translate-y-0.5">Start a workflow <ArrowRight className="h-4 w-4" /></a>
                <a href="/mail-a-pdf" className="inline-flex items-center gap-2 rounded-md border border-white/50 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">Mail a PDF</a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60 bg-paper-deep/25">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-1 sm:px-6 md:grid-cols-4">
            {[
              { icon: <FileSearch className="h-4 w-4" />, label: "Source-first", text: "Start with the actual document" },
              { icon: <CheckCircle2 className="h-4 w-4" />, label: "Reviewable", text: "Facts and evidence stay visible" },
              { icon: <Eye className="h-4 w-4" />, label: "Approval held", text: "Review before mailing" },
              { icon: <Mail className="h-4 w-4" />, label: "Mailing optional", text: "Tracking and proof when available" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 px-3 py-5 md:px-5">
                <div className="mt-0.5 text-cobalt">{item.icon}</div>
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-3xl">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Workflow directory</div>
                <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Start with the problem you actually have.</h2>
                <p className="mt-4 text-base leading-7 text-muted-foreground">{config.directoryDescription}</p>
              </div>
              <a href={`${config.path}/workflows`} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cobalt">
                View all workflows <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {featured.length ? (
              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((page) => (
                  <WorkflowPreview key={page.id} page={page} config={config} />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-xl border border-rule bg-card p-7">
                <div className="font-serif text-2xl">The public directory is being populated.</div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">The product page is live while individual workflow guides remain under review. No unfinished guide is made indexable merely because its route exists.</p>
              </div>
            )}
          </div>
        </section>

        <section className="border-b border-rule/60 bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-3xl">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">How it works</div>
              <h2 className="mt-3 font-serif text-4xl sm:text-5xl">One shared operating pattern. Domain-specific guidance.</h2>
            </div>
            <div className="mt-10 grid overflow-hidden rounded-xl border border-rule md:grid-cols-4">
              {config.steps.map((step, index) => (
                <div key={step.title} className="border-b border-rule p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <div className="font-serif text-3xl text-cobalt">0{index + 1}</div>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Authority without pretending</div>
              <h2 className="mt-3 font-serif text-4xl">Useful before the software workflow exists.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthorityPoint title="Individual review" text="Workflow guides remain non-indexable until they pass the MailMyPDF Authority Gate and their sources, scope, and unique value have been reviewed." />
              <AuthorityPoint title="No invented facts" text="Public guidance must stay anchored to source documents, verified facts, and authoritative references rather than generic assumptions." />
              <AuthorityPoint title="Execution is a separate state" text="A useful SEO authority page does not claim that its underlying workflow engine is already implemented." />
              <AuthorityPoint title="Shared fulfillment" text="When appropriate, a finished document can flow into MailMyPDF printing, mailing, tracking, and proof without changing the informational standard of the guide." />
            </div>
          </div>
        </section>

        <section className="bg-cobalt text-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl">{config.helperTitle}</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/70">{config.helperDescription}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={`${config.path}/workflows`} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-cobalt">Find a workflow <ArrowRight className="h-4 w-4" /></a>
              <a href="/mail-a-pdf" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white">Mail a PDF</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function WorkflowPreview({ page, config }: { page: WorkflowAuthorityPageData; config: PublicVerticalConfig }) {
  const category = categoryForWorkflow(config, `${page.title} ${page.description} ${page.path}`);
  return (
    <a href={page.path} className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-rule bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-premium">
      <div className="relative h-20 overflow-hidden border-b border-rule bg-gradient-to-br from-paper-deep to-card">
        <div className="absolute -right-5 -top-8 h-28 w-28 rotate-12 rounded border border-rule bg-white/55" aria-hidden />
        <span className="absolute bottom-3 left-4 rounded-full border border-rule bg-card/90 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt">{category}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{pageStatus(page)}</div>
        <h3 className="mt-2 font-serif text-2xl leading-tight">{page.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{page.description}</p>
        <div className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold">
          <span>{page.executionHref ? "Open workflow" : "Read guide"}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-card transition group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
        </div>
      </div>
    </a>
  );
}

function AuthorityPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rule bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-cobalt" />{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

export function PublicVerticalWorkflowDirectoryPage({ id }: { id: PublicVerticalId }) {
  const config = publicVerticalById(id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All workflows");
  if (!config) return null;
  const pages = pagesFor(config);
  const directoryItems = pages.map((page) => ({
    page,
    category: categoryForWorkflow(config, `${page.title} ${page.description} ${page.path}`),
  }));
  const categoryNames = ["All workflows", ...Array.from(new Set(directoryItems.map((item) => item.category)))];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return directoryItems.filter((item) => {
      const matchesCategory = category === "All workflows" || item.category === category;
      const matchesQuery = !needle || `${item.page.title} ${item.page.description} ${item.page.path} ${item.category}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, directoryItems, query]);

  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-gradient-to-b from-card to-paper">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <a href={config.path} className="text-xs font-medium text-muted-foreground hover:text-foreground">MailMyPDF / {config.product}</a>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">{config.eyebrow}</div>
            <h1 className="mt-3 max-w-4xl font-serif text-5xl leading-[0.98] sm:text-6xl">{config.product} Workflows</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-soft">{config.directoryDescription}</p>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="self-start lg:sticky lg:top-20">
              <div className="overflow-hidden rounded-xl border border-rule bg-card">
                <div className="border-b border-rule px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Categories</div>
                {categoryNames.map((name) => {
                  const count = name === "All workflows" ? directoryItems.length : directoryItems.filter((item) => item.category === name).length;
                  return (
                    <button key={name} type="button" onClick={() => setCategory(name)} className={`flex w-full items-center justify-between border-b border-rule/70 px-4 py-3 text-left text-sm last:border-b-0 ${category === name ? "bg-paper-deep font-semibold text-cobalt" : "hover:bg-paper-deep/45"}`}>
                      <span>{name}</span><span className="text-xs text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border border-rule bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><FolderSearch2 className="h-4 w-4 text-cobalt" />{config.helperTitle}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{config.helperDescription}</p>
                <a href="/mail-a-pdf" className="mt-4 inline-flex text-xs font-semibold text-cobalt">Already have a finished PDF? Mail it →</a>
              </div>
            </aside>

            <div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.product} workflows…`} className="h-12 w-full rounded-lg border border-rule bg-card pl-11 pr-4 text-sm outline-none transition focus:border-cobalt" />
                </label>
                <div className="flex h-12 items-center rounded-lg border border-rule bg-card px-4 text-xs text-muted-foreground">{filtered.length} of {directoryItems.length} workflows</div>
              </div>

              {filtered.length ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map(({ page, category: itemCategory }) => (
                    <a key={page.id} href={page.path} className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-rule bg-card transition hover:-translate-y-0.5 hover:shadow-premium">
                      <div className="relative h-16 border-b border-rule bg-gradient-to-br from-paper-deep to-card">
                        <span className="absolute bottom-2 left-4 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt">{itemCategory}</span>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{pageStatus(page)}</div>
                        <h2 className="mt-2 font-serif text-2xl leading-tight">{page.title}</h2>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{page.description}</p>
                        <div className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold">
                          <span>{page.executionHref ? "Open workflow" : "Explore guide"}</span>
                          <ArrowRight className="h-4 w-4 text-cobalt transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-rule bg-card p-10 text-center">
                  <FileSearch className="mx-auto h-6 w-6 text-cobalt" />
                  <h2 className="mt-3 font-serif text-2xl">No matching workflow</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Try a broader document name, agency, notice number, problem, or category.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-rule bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">A consistent preparation model</div>
            <h2 className="mt-3 max-w-3xl font-serif text-4xl sm:text-5xl">From source document to a record you can review.</h2>
            <div className="mt-8 grid overflow-hidden rounded-xl border border-rule md:grid-cols-4">
              {config.steps.map((step, index) => (
                <div key={step.title} className="border-b border-rule p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                  <div className="font-serif text-3xl text-cobalt">0{index + 1}</div>
                  <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-cobalt text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-18 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-4xl">Still not sure where to start?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{config.helperDescription}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={config.path} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-cobalt">Back to {config.product}</a>
              <a href="/mail-a-pdf" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white">Mail a PDF</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
