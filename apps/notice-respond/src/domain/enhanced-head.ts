/**
 * Enhanced SEO head generator for workflow routes.
 *
 * Merges the catalog's built-in SEO with rich FAQ content, keywords,
 * breadcrumbs, and structured data from workflow-seo.ts.
 *
 * Usage in a route:
 *   import { createWorkflowHead } from "@/domain/enhanced-head";
 *   head: () => createWorkflowHead("cp2000-response"),
 */
import { getWorkflowById } from "./workflow-catalog";
import { getWorkflowSEO } from "./workflow-seo";

export function createWorkflowHead(workflowId: string) {
  const def = getWorkflowById(workflowId);
  if (!def) {
    return {
      meta: [{ title: "Notice Respond" }],
      links: [],
      scripts: [],
    };
  }

  const seo = getWorkflowSEO(workflowId);
  const faq = seo?.faq ?? def.seo?.faq ?? [];
  const keywords = seo?.keywords ?? [];

  const scripts: Array<{ type: string; children: string }> = [
    // FAQPage structured data
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }),
    },
    // WebApplication structured data
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: def.title,
        description: def.description,
        applicationCategory: "LegalDocumentService",
        operatingSystem: "Web",
        offers: { "@type": "Offer", priceFrom: "4.99", priceCurrency: "USD" },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "127",
        },
      }),
    },
  ];

  // BreadcrumbList structured data
  if (seo?.breadcrumb) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: seo.breadcrumb.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `https://noticerespond.com${item.path}`,
        })),
      }),
    });
  }

  const meta: Array<Record<string, string>> = [
    { title: def.seo?.title ?? `${def.title} — Notice Respond` },
    { name: "description", content: def.seo?.description ?? def.description },
    { property: "og:title", content: def.seo?.openGraph?.title ?? def.title },
    { property: "og:description", content: def.seo?.openGraph?.description ?? def.description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Notice Respond" },
    { name: "twitter:card", content: seo?.twitterCard ?? "summary_large_image" },
    { name: "twitter:title", content: def.seo?.openGraph?.title ?? def.title },
    { name: "twitter:description", content: def.seo?.openGraph?.description ?? def.description },
  ];

  if (keywords.length > 0) {
    meta.push({ name: "keywords", content: keywords.join(", ") });
  }

  // Add canonical and robots
  const links: Array<Record<string, string>> = [
    { rel: "canonical", href: def.seo?.canonical ?? def.searchIntent.canonicalPath },
    { rel: "robots", content: "index, follow" },
  ];

  // Add internal linking hints via preconnect
  links.push({ rel: "preconnect", href: "https://noticerespond.com" });

  return { meta, links, scripts };
}
