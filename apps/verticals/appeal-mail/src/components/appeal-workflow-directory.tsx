import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, CheckCircle2, ArrowRight } from "lucide-react";
import { workflows } from "@/domain/workflows";
import { getWorkflowHeroImage } from "@/domain/workflow-hero-images";

const PLACEHOLDER_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png";

function categoryFor(slug: string): string {
  if (slug.includes("insurance") || slug.includes("claim") || slug.includes("medical") || slug.includes("authorization")) return "Insurance & Claims";
  if (slug.includes("ssdi") || slug.includes("ssi") || slug.includes("social-security") || slug.includes("medicaid") || slug.includes("unemployment") || slug.includes("edd")) return "Benefits & Government Programs";
  if (slug.includes("financial-aid") || slug.includes("sap") || slug.includes("scholarship") || slug.includes("fafsa")) return "Education & Financial Aid";
  if (slug.includes("license") || slug.includes("dmv") || slug.includes("registration")) return "Licensing & DMV";
  if (slug === "government-decision" || slug === "court-ruling" || slug === "reconsideration") return "General Appeals";
  return "Appeals";
}

export function AppealWorkflowDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const entries = Object.values(workflows);
  const categories = Array.from(new Set(entries.map((w) => categoryFor(w.id)))).sort();
  const filtered = useMemo(() => entries.filter((w) => {
    const haystack = [w.id, w.title, w.description, w.primaryKeyword || "", ...w.focusAreas].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (category === "ALL" || categoryFor(w.id) === category);
  }), [entries, query, category]);

  return <div>
    <div className="sticky top-14 z-30 border-b border-rule/60 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search appeals — insurance, SSDI, financial aid, DMV…" className="w-full rounded-full border border-rule bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10" aria-label="Search appeal workflows" /></div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-rule bg-card px-4 py-2.5 text-sm outline-none" aria-label="Filter appeal workflows by category"><option value="ALL">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="mt-3 font-mono text-xs text-muted-foreground">{filtered.length} workflows · search by situation, document, organization, or outcome</div>
      </div>
    </div>
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-12">{categories.filter((c) => category === "ALL" || c === category).map((cat) => { const items = filtered.filter((w) => categoryFor(w.id) === cat); if (!items.length) return null; return <section key={cat}><div className="mb-5 flex items-center gap-3"><h3 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{cat}</h3><span className="h-px flex-1 bg-rule/60" /><span className="font-mono text-xs text-muted-foreground">{items.length}</span></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map((workflow) => {
        const img = getWorkflowHeroImage(workflow.id) || PLACEHOLDER_IMAGE;
        return <Link key={workflow.id} to={`/workflows/${workflow.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-rule/80 bg-card shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-ink/20 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stamp/50">
          <div className="relative aspect-[16/9] overflow-hidden border-b border-rule/60 bg-paper-deep"><img src={img} alt="" aria-hidden="true" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /><div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" /><span className="absolute bottom-3 left-4 rounded-full border border-paper/30 bg-ink/65 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper backdrop-blur-sm">{cat}</span><span className="absolute bottom-3 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-paper/25 bg-ink/60 text-paper backdrop-blur-sm transition-transform group-hover:translate-x-0.5"><ArrowRight size={14} /></span></div>
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><CheckCircle2 size={10} className="text-stamp" /> Available</div>
            <h3 className="font-serif text-[1.55rem] leading-[1.12] tracking-[-0.01em] text-foreground">{workflow.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
            <div className="mt-5 border-t border-rule/60 pt-4"><div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Search intent</div><div className="mt-1.5 text-xs leading-5 text-ink-soft">{workflow.primaryKeyword || "Specialized appeal response"}</div></div>
            <div className="mt-5 flex items-center justify-between text-sm font-medium"><span>View workflow</span><span className="text-stamp transition-transform group-hover:translate-x-1">→</span></div>
          </div>
        </Link>;
      })}</div></section>; })}</div>
    </div>
  </div>;
}
