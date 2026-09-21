import type { WorkflowLandingConfig } from "@mailmypdf/design-system"
import { SITE_ORIGIN } from "./section-head.js"

export function createWorkflowHead(config: WorkflowLandingConfig) {
  const canonical = SITE_ORIGIN + config.path
  const robots = config.indexable
    ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    : "noindex,follow"

  return {
    meta: [
      { title: config.seoTitle },
      { name: "description", content: config.seoDescription },
      { name: "robots", content: robots },
      { property: "og:title", content: config.seoTitle },
      { property: "og:description", content: config.seoDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MailMyPDF" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: config.seoTitle },
      { name: "twitter:description", content: config.seoDescription },
    ],
    links: [{ rel: "canonical", href: canonical }],
  }
}

export function createWorkflowSchema(config: WorkflowLandingConfig) {
  const canonical = SITE_ORIGIN + config.path
  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "MailMyPDF", item: SITE_ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: config.sectionName, item: SITE_ORIGIN + config.sectionPath },
        { "@type": "ListItem", position: 3, name: config.title, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: config.seoTitle.replace(" | MailMyPDF", ""),
      description: config.seoDescription,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "MailMyPDF", url: SITE_ORIGIN + "/" },
      about: { "@type": "Thing", name: config.title },
    },
  ]

  if (config.faqs?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    })
  }

  if (config.workflowSteps?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: config.heroTitle,
      description: config.seoDescription,
      step: config.workflowSteps.map(([name, text], index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name,
        text,
      })),
    })
  }

  return schemas
}
