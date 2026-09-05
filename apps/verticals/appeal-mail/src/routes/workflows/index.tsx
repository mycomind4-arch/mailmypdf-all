import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { APPEAL_CATALOG, CATEGORY_ORDER } from "@/domain/appeal-catalog";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://appeal-mail.pages.dev";
const WorkflowDirectory = createWorkflowDirectory(createElement);

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Appeal Workflows — Find the Right Appeal | Appeal Mail" },
      { name: "description", content: "Browse Appeal Mail workflows for insurance denials, Social Security and disability decisions, unemployment, government benefits, veterans benefits, and administrative appeals." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Appeal Workflows | Appeal Mail" },
      { property: "og:description", content: "Find the appeal workflow that matches the decision or denial you received." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Appeal Mail" },
      { property: "og:url", content: SITE_ORIGIN + "/workflows" },
      { property: "og:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/workflows" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Appeal Mail Workflows",
        itemListElement: APPEAL_CATALOG.map((workflow, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: workflow.title,
          url: SITE_ORIGIN + workflow.route,
        })),
      }),
    }],
  }),
  component: WorkflowDirectoryPage,
});

function WorkflowDirectoryPage() {
  const items = APPEAL_CATALOG.map((workflow) => ({
    id: workflow.slug,
    title: workflow.title,
    category: workflow.category,
    description: workflow.shortDescription,
    href: workflow.route,
    badge: workflow.status === "IMPLEMENTED" && workflow.executable ? "Available" : "Catalog",
    keywords: [workflow.primaryKeyword, ...workflow.relatedKeywords],
  }));

  return (
    <main>
      <SiteHeader />
      <WorkflowDirectory
        productName="Appeal Mail"
        title="Find the right appeal workflow for your situation."
        description="Start with the denial, decision, or adverse notice you received. Browse by appeal family or search the complete catalog, then open the workflow built for that specific situation."
        items={items}
        categories={CATEGORY_ORDER.map((category) => ({ id: category, label: category }))}
        searchPlaceholder="Search appeals, agencies, denials, or benefits…"
        helperTitle="Not sure which appeal you need?"
        helperDescription="Start from the denial or decision letter you already have. Browse the closest category and compare the workflow descriptions before you begin."
        helperHref="/appeal-a-decision"
        helperLabel="Find My Appeal"
        steps={[
          { title: "Upload your decision", description: "Start from the denial, decision, or adverse notice you received." },
          { title: "Understand the record", description: "Organize the stated issues, dates, and supporting evidence." },
          { title: "Build and review", description: "Prepare the appeal packet and review every fact before approval." },
          { title: "Send and keep proof", description: "Download it or choose MailMyPDF mailing, tracking, and proof options." },
        ]}
        finalTitle="You still have options."
        finalDescription="Choose the workflow that matches the decision you received and start building a clear, reviewable appeal record."
        finalHref="/appeal-a-decision"
        finalLabel="Find My Appeal"
      />
      <SiteFooter />
    </main>
  );
}
