import type { SectionLandingConfig } from "@mailmypdf/design-system"

export const SITE_ORIGIN = "https://mailmypdf.pages.dev"

export function createSectionHead(config: SectionLandingConfig) {
  const canonical = SITE_ORIGIN + config.path
  const image = SITE_ORIGIN + config.heroImage

  return {
    meta: [
      { title: config.seoTitle },
      { name: "description", content: config.seoDescription },
      { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" },
      { property: "og:title", content: config.seoTitle },
      { property: "og:description", content: config.seoDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MailMyPDF" },
      { property: "og:url", content: canonical },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: config.seoTitle },
      { name: "twitter:description", content: config.seoDescription },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "MailMyPDF", item: SITE_ORIGIN + "/" },
            { "@type": "ListItem", position: 2, name: config.name, item: canonical },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: config.seoTitle.replace(" | MailMyPDF", ""),
          description: config.seoDescription,
          url: canonical,
          isPartOf: { "@type": "WebSite", name: "MailMyPDF", url: SITE_ORIGIN + "/" },
        }),
      },
    ],
  }
}
