import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NOTICE_WORKFLOWS, workflowCategories } from "@/components/notice-workflow-directory-fixed";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://notice-respond.pages.dev";
const WorkflowDirectory = createWorkflowDirectory(createElement);

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Notice Response Workflows | Notice Respond" },
      { name: "description", content: "Browse Notice Respond workflows for IRS notices, Social Security notices, DMV and state notices, benefits notices, code enforcement, permits, courts, and other agency actions." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Notice Response Workflows | Notice Respond" },
      { property: "og:description", content: "Find the workflow that matches the official notice or agency action in front of you." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Notice Respond" },
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
        name: "Notice Respond Workflows",
        itemListElement: NOTICE_WORKFLOWS.map((w, i) => ({ "@type": "ListItem", position: i + 1, name: w.title, url: SITE_ORIGIN + w.route })),
      }),
    }],
  }),
  component: WorkflowsDirectory,
});

function WorkflowsDirectory() {
  const groups = workflowCategories();
  const items = NOTICE_WORKFLOWS.map(workflow => ({
    id: workflow.slug,
    title: workflow.title,
    category: workflow.category,
    description: workflow.description,
    href: workflow.route,
    eyebrow: workflow.searchIntent,
    meta: workflow.lifecycle,
    keywords: [workflow.searchIntent, workflow.bestFor, ...workflow.documents],
  }));

  return <main><SiteHeader/><WorkflowDirectory
    productName="Notice Respond"
    title="Find the workflow for the notice in front of you."
    description="Browse the executable Notice Respond catalog by notice family, agency, or problem. Public pages explain the workflow first; starting a private workflow remains account-protected."
    items={items}
    categories={groups.map(group => ({ id: group.category, label: group.category }))}
    searchPlaceholder="Search CP2000, CP14, CP504, SSA, DMV, benefits, code enforcement…"
    helperTitle="Have a notice but don't know which workflow it needs?"
    helperDescription="Use the notice title, agency, form or notice number, and requested action to narrow the directory. You can also use the authenticated notice analyzer after signing in."
    helperHref="/workflows/analyze"
    helperLabel="Analyze My Notice"
    steps={[
      { title: "Identify the notice", description: "Start from the exact agency document, notice number, dates, and requested action." },
      { title: "Organize facts & evidence", description: "Keep extracted facts, your supplied facts, and supporting records distinct and reviewable." },
      { title: "Prepare & approve", description: "Build the response in the protected workflow and review the exact draft before approval." },
      { title: "Send & keep proof", description: "Use MailMyPDF mailing, tracking, and proof options only after explicit authorization." },
    ]}
    finalTitle="Don't ignore the notice. Build the response around it."
    finalDescription="Choose the workflow that matches the agency action and move into the protected response workspace when you're ready to start."
    finalHref="/workflows/analyze"
    finalLabel="Analyze My Notice"
  /><SiteFooter/></main>;
}
