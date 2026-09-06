import { createFileRoute } from "@tanstack/react-router";
import { ProductPlaceholderPage } from "@/components/product-placeholder-page";
import { WorkflowAuthorityPage } from "@/components/workflow-authority-page";
import { WorkflowAuthorityRichPage } from "@/components/workflow-authority-rich-page";
import {
  PublicVerticalLandingPage,
  PublicVerticalWorkflowDirectoryPage,
  publicVerticalHead,
} from "@/components/public-vertical-page";
import { workflowAuthorityForPath } from "@/lib/workflow-authority-registry";
import { publicVerticalByPath } from "@/lib/public-verticals";
import { absoluteUrl } from "@/lib/site-url";

const PRODUCT_FAMILIES: Record<string, { product: string; title: string; description: string }> = {
  appeal: { product: "Appeal Mail", title: "Appeal workflow", description: "Prepare a documented appeal with the MailMyPDF workflow engine." },
  "appeal-mail": { product: "Appeal Mail", title: "Appeal workflow", description: "Prepare a documented appeal with the MailMyPDF workflow engine." },
  notice: { product: "Notice Respond", title: "Notice response workflow", description: "Organize a notice, understand its requirements, prepare a response, and preserve the mailing record." },
  "notice-respond": { product: "Notice Respond", title: "Notice response workflow", description: "Organize a notice, understand its requirements, prepare a response, and preserve the mailing record." },
  immigration: { product: "Immigration Mail", title: "Immigration correspondence workflow", description: "Prepare immigration-related correspondence and supporting documents with source-grounded review." },
  "immigration-mail": { product: "Immigration Mail", title: "Immigration correspondence workflow", description: "Prepare immigration-related correspondence and supporting documents with source-grounded review." },
  dispute: { product: "Dispute Mail", title: "Dispute workflow", description: "Build an evidence-backed dispute, review it, and preserve what you sent." },
  "dispute-mail": { product: "Dispute Mail", title: "Dispute workflow", description: "Build an evidence-backed dispute, review it, and preserve what you sent." },
  business: { product: "Small Business", title: "Business correspondence workflow", description: "Prepare business correspondence with approval and recordkeeping controls." },
  "small-business": { product: "Small Business", title: "Business correspondence workflow", description: "Prepare business correspondence with approval and recordkeeping controls." },
  records: { product: "Records Requests", title: "Records request workflow", description: "Prepare a focused records or information request with recipient, scope, and proof handling." },
  "records-request": { product: "Records Requests", title: "Records request workflow", description: "Prepare a focused records or information request with recipient, scope, and proof handling." },
  tenant: { product: "Tenant Reply", title: "Tenant response workflow", description: "Prepare a documented housing or tenant-related response." },
  "tenant-reply": { product: "Tenant Reply", title: "Tenant response workflow", description: "Prepare a documented housing or tenant-related response." },
  permit: { product: "Permit Reply", title: "Permit response workflow", description: "Prepare a permit, licensing, or regulatory response with requirement-aware review." },
  "permit-reply": { product: "Permit Reply", title: "Permit response workflow", description: "Prepare a permit, licensing, or regulatory response with requirement-aware review." },
  benefits: { product: "Benefits Appeal", title: "Benefits appeal workflow", description: "Prepare a benefits-related appeal using source documents, evidence, deadlines, and review." },
  "benefits-appeal": { product: "Benefits Appeal", title: "Benefits appeal workflow", description: "Prepare a benefits-related appeal using source documents, evidence, deadlines, and review." },
  claim: { product: "Claim Proof", title: "Claim proof workflow", description: "Organize claim evidence and preserve a traceable proof package." },
  "claim-proof": { product: "Claim Proof", title: "Claim proof workflow", description: "Organize claim evidence and preserve a traceable proof package." },
  "code-enforcement": { product: "Code Enforcement", title: "Code enforcement workflow", description: "Understand and respond to code enforcement notices, inspections, evidence requests, and follow-up actions." },
  insurance: { product: "Insurance Claims", title: "Insurance claim workflow", description: "Prepare claim correspondence, evidence, disputes, and appeals around insurance decisions." },
  "insurance-claims": { product: "Insurance Claims", title: "Insurance claim workflow", description: "Prepare claim correspondence, evidence, disputes, and appeals around insurance decisions." },
  "private-office": { product: "Private Office", title: "Private Office workflow", description: "Prepare high-stakes private correspondence and controlled document records." },
  mail: { product: "MailMyPDF", title: "Mailing workflow", description: "Prepare, review, and mail important documents while keeping the mailing record together." },
  future: { product: "MailMyPDF", title: "MailMyPDF workflow", description: "This reserved MailMyPDF URL is part of the canonical future workflow graph." },
};

function normalizePath(splat: string | undefined) {
  return `/${splat ?? ""}`.replace(/\/+$/, "") || "/";
}

function familyFor(path: string) {
  const family = path.split("/").filter(Boolean)[0] ?? "future";
  return PRODUCT_FAMILIES[family];
}

function workflowHead(path: string) {
  const page = workflowAuthorityForPath(path);
  if (!page) return null;

  const title = page.seoTitle;
  const canonical = absoluteUrl(page.path);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "MailMyPDF", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: page.product, item: absoluteUrl(page.productHref) },
      { "@type": "ListItem", position: 3, name: page.title, item: canonical },
    ],
  };
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "MailMyPDF", url: absoluteUrl("/") },
    about: page.pipeline,
    dateModified: page.reviewedAt ?? undefined,
  };
  const faq = page.indexable && page.faqPairs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqPairs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;

  return {
    meta: [
      { title },
      { name: "description", content: page.description },
      { name: "robots", content: page.indexable ? "index,follow" : "noindex,follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: page.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: page.description },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [webPage, breadcrumb, faq]
      .filter(Boolean)
      .map((schema) => ({ type: "application/ld+json", children: JSON.stringify(schema) })),
  };
}

export const Route = createFileRoute("/$")({
  component: ReservedPublicRoute,
  head: ({ params }) => {
    const path = normalizePath(params._splat);
    const vertical = publicVerticalByPath(path);
    if (vertical) return publicVerticalHead(vertical.config.id, vertical.kind);

    const authorityHead = workflowHead(path);
    if (authorityHead) return authorityHead;

    const family = familyFor(path);
    return {
      meta: [
        { title: `${family?.title ?? "MailMyPDF workflow"} — MailMyPDF` },
        { name: "description", content: family?.description ?? "A reserved MailMyPDF workflow URL." },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
});

function ReservedPublicRoute() {
  const { _splat } = Route.useParams();
  const path = normalizePath(_splat);
  const vertical = publicVerticalByPath(path);

  if (vertical?.kind === "landing") {
    return <PublicVerticalLandingPage id={vertical.config.id} />;
  }

  if (vertical?.kind === "directory") {
    return <PublicVerticalWorkflowDirectoryPage id={vertical.config.id} />;
  }

  const workflowPage = workflowAuthorityForPath(path);

  if (workflowPage?.authority) {
    return <WorkflowAuthorityRichPage page={{ ...workflowPage, authority: workflowPage.authority }} />;
  }

  if (workflowPage) {
    return <WorkflowAuthorityPage page={workflowPage} />;
  }

  const family = familyFor(path);
  if (!family) {
    return <ProductPlaceholderPage product="MailMyPDF" title="Page not found" description="The requested MailMyPDF URL does not exist." path={path} />;
  }

  return <ProductPlaceholderPage product={family.product} title={family.title} description={family.description} path={path} />;
}
