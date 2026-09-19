import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { letterTemplates } from "@/lib/templates";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Letter Templates — MailMyPDF" },
      { name: "description", content: "Browse 20+ professional letter templates. Legal, personal, business, and official. Customize, print, and mail — no printer needed." },
    ],
  }),
  component: TemplatesPage,
});

const CATEGORIES = ["All", "Legal", "Personal", "Business", "Official"] as const;
type Category = typeof CATEGORIES[number];

function TemplatesPage() {
  const [filter, setFilter] = useState<Category>("All");

  const templates = filter === "All"
    ? letterTemplates
    : letterTemplates.filter((t) => t.category === filter);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="postmark w-fit">Templates</div>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Letter Templates</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Pick a template, customize it, and we'll print and mail it for you.
          All templates support color printing, certified mail, and future-self scheduling.
        </p>

        {/* Category filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "border border-rule text-ink-soft hover:border-ink hover:text-foreground"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({letterTemplates.filter((t) => t.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <Link
              key={tmpl.id}
              to="/write"
              search={{ template: tmpl.id }}
              className="envelope-card group flex flex-col p-6 transition-shadow hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-xl group-hover:text-cobalt transition-colors">{tmpl.title}</h3>
                <span className="shrink-0 rounded-sm bg-paper-deep px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {tmpl.category}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{tmpl.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cobalt">
                Use this template
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
                  <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        {/* Info banner */}
        <div className="mt-12 rounded-lg border border-rule/70 bg-paper-deep/50 p-6">
          <h2 className="font-serif text-2xl">Every template includes</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-stamp" />
              <span>Color or black-and-white printing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-stamp" />
              <span>Standard, certified, or registered mail</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-stamp" />
              <span>Schedule delivery up to 5 years out</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Don't see what you need?</p>
          <Link
            to="/write"
            search={{ template: undefined }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Write from scratch →
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
