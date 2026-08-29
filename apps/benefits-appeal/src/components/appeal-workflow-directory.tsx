import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { APPEAL_CATALOG, CATEGORY_ORDER } from "@/domain/appeal-catalog";

export function AppealWorkflowDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");

  const entries = useMemo(() => {
    let filtered = APPEAL_CATALOG;
    if (category !== "ALL") {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.shortDescription.toLowerCase().includes(q) ||
        e.primaryKeyword.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [query, category]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-rule bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ink focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-rule bg-card py-2.5 px-4 text-sm text-foreground focus:border-ink focus:outline-none"
        >
          <option value="ALL">All categories</option>
          {CATEGORY_ORDER.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.slug}
            to={entry.workflowRoute}
            className="block rounded-2xl border border-rule bg-paper-deep/30 p-6 transition-colors hover:bg-muted/40"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{entry.category}</div>
            <h3 className="mt-2 font-serif text-lg">{entry.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.shortDescription}</p>
            <span className="mt-4 inline-block text-sm font-medium text-ink">{entry.cta} &rarr;</span>
          </Link>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          No workflows found. Try a different search.
        </div>
      )}
    </div>
  );
}
