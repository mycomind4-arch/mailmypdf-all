import { RESERVED_WORKFLOW_AUTHORITY_PAGES, WORKFLOW_AUTHORITY_PAGES } from "@mailmypdf/workflows";

export type SitemapEntry = {
  loc: string;
  changefreq: "daily" | "weekly" | "monthly";
  priority: number;
  indexable: boolean;
};

export type SitemapOptions = {
  canonicalOrigin?: string;
  launchReady?: boolean;
};

const CORE_PUBLIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/send", priority: 0.9 },
  { path: "/write", priority: 0.9 },
  { path: "/pricing", priority: 0.7 },
  { path: "/ecosystem", priority: 0.9 },
  { path: "/how-it-works", priority: 0.8 },
  { path: "/resources", priority: 0.7 },
  { path: "/templates", priority: 0.7 },
  { path: "/proof-of-service", priority: 0.7 },
] as const;

export function buildEcosystemSitemap(options: SitemapOptions = {}): readonly SitemapEntry[] {
  const origin = (options.canonicalOrigin ?? "https://mailmypdf.ai").replace(/\/$/, "");
  const indexable = options.launchReady === true;
  const core = CORE_PUBLIC_ROUTES.map((route): SitemapEntry => ({
    loc: `${origin}${route.path}`,
    changefreq: route.path === "/resources" || route.path === "/templates" ? "weekly" : "monthly",
    priority: route.priority,
    indexable,
  }));

  const workflows = [...WORKFLOW_AUTHORITY_PAGES, ...RESERVED_WORKFLOW_AUTHORITY_PAGES].map((page): SitemapEntry => ({
    loc: `${origin}${page.canonicalPath}`,
    changefreq: "monthly",
    priority: page.maturity === "placeholder" ? 0.7 : 0.8,
    indexable,
  }));

  const deduped = new Map<string, SitemapEntry>();
  for (const entry of [...core, ...workflows]) deduped.set(entry.loc, entry);
  return [...deduped.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

export function renderSitemapXml(entries: readonly SitemapEntry[]): string {
  const urls = entries
    .filter((entry) => entry.indexable)
    .map((entry) => `  <url><loc>${escapeXml(entry.loc)}</loc><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority.toFixed(1)}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
