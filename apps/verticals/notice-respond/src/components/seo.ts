/**
 * Notice Response — Shared SEO utilities
 *
 * Provides consistent, comprehensive SEO metadata generation across
 * all routes: title, description, canonical, OpenGraph, Twitter cards,
 * and structured data (JSON-LD).
 */

const SITE_ORIGIN = "https://notice-respond.pages.dev";
const SITE_NAME = "Notice Respond · MailMyPDF";

/** Full canonical URL from a path */
export function canonicalURL(path: string): string {
  return path.startsWith("http") ? path : SITE_ORIGIN + (path.startsWith("/") ? path : "/" + path);
}

/**
 * Generate comprehensive meta tags for any page.
 * Use this as the base for all route head() functions.
 */
export function buildMeta({
  title,
  description,
  path,
  ogImage,
  ogType = "website",
}: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: string;
}) {
  const url = canonicalURL(path);
  const fullTitle = title.includes("Notice Respond") ? title : `${title} | Notice Respond`;

  const meta: Record<string, string>[] = [
    { title: fullTitle },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    // OpenGraph
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: url },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];

  if (ogImage) {
    meta.push({ property: "og:image", content: ogImage });
    meta.push({ name: "twitter:image", content: ogImage });
  }

  return { meta, links: [{ rel: "canonical", href: url }] };
}

/**
 * Build BreadcrumbList structured data.
 */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonicalURL(item.path),
    })),
  };
}

/**
 * Build FAQPage structured data from Q&A pairs.
 */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * Build a WebPage schema with optional breadcrumbs and action.
 */
export function webPageSchema({
  name,
  description,
  path,
  about,
}: {
  name: string;
  description: string;
  path: string;
  about?: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: canonicalURL(path),
    isPartOf: { "@type": "WebSite", name: "Notice Respond", url: SITE_ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "MailMyPDF",
      url: "https://mailmypdf.com",
    },
  };
  if (about) data["about"] = about;
  return data;
}

/**
 * Build WebApplication schema for workflow pages.
 */
export function webAppSchema({
  name,
  description,
  path,
  category = "LegalDocumentService",
}: {
  name: string;
  description: string;
  path: string;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: canonicalURL(path),
    applicationCategory: category,
    operatingSystem: "Web",
    isPartOf: { "@type": "WebSite", name: "Notice Respond", url: SITE_ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "MailMyPDF",
      url: "https://mailmypdf.com",
    },
  };
}

/**
 * Combine multiple JSON-LD scripts into a scripts array for TanStack head().
 */
export function jsonLd(...objects: Record<string, unknown>[]) {
  return objects.map((obj) => ({
    type: "application/ld+json",
    children: JSON.stringify(obj),
  }));
}

/** Homepage Organization + WebSite schema */
export function homepageSchema(workflows: { title: string; route: string; searchIntent: string }[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Notice Respond",
      url: SITE_ORIGIN,
      brand: { "@type": "Brand", name: "MailMyPDF" },
      description: "Specialized workflows for responding to official notices and government correspondence.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Notice Respond",
      url: SITE_ORIGIN,
      description: "Understand the notice. Build the response. Send it with proof.",
      publisher: { "@type": "Organization", name: "MailMyPDF" },
      hasPart: workflows.map((w) => ({
        "@type": "WebPage",
        name: w.title,
        url: canonicalURL(w.route),
        about: w.searchIntent,
      })),
    },
  ];
}

/** ItemList schema for directory pages */
export function itemListSchema(items: { name: string; url: string; description: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Notice Respond Workflows",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

/**
 * Build comprehensive SEO head() for an interactive workflow route.
 * Uses MasterWorkflowDefinition's seo field for title/description/og/faq.
 * Adds Twitter cards, BreadcrumbList, WebApplication schema, and FAQPage.
 */
export function buildWorkflowRouteHead(def: {
  id: string;
  title: string;
  description: string;
  searchIntent: { canonicalPath: string };
  seo?: {
    title: string;
    description: string;
    canonical?: string;
    openGraph?: { title: string; description: string };
    faq?: { question: string; answer: string }[];
  };
}) {
  const path = def.seo?.canonical ?? def.searchIntent.canonicalPath;
  const url = canonicalURL(path);
  const title = def.seo?.title ?? `${def.title} | Notice Respond`;
  const description = def.seo?.description ?? def.description;
  const ogTitle = def.seo?.openGraph?.title ?? def.title;
  const ogDescription = def.seo?.openGraph?.description ?? def.description;

  const meta = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Notice Respond · MailMyPDF" },
    { property: "og:url", content: url },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  const links = [{ rel: "canonical", href: url }];

  const scripts: { type: string; children: string }[] = [
    {
      type: "application/ld+json",
      children: JSON.stringify(
        breadcrumbSchema([
          { name: "Notice Respond", path: "/" },
          { name: "Workflows", path: "/workflows" },
          { name: def.title, path },
        ])
      ),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify(
        webAppSchema({ name: def.title, description, path })
      ),
    },
  ];

  if (def.seo?.faq && def.seo.faq.length > 0) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(faqSchema(def.seo.faq)),
    });
  }

  return { meta, links, scripts };
}
