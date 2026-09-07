import { createFileRoute } from "@tanstack/react-router";
import { AppealWorkflowDirectory } from "@/components/appeal-workflow-directory";
import { workflows, appealWorkflowCount } from "@/domain/workflows";

const SITE_ORIGIN = "https://appeal-mail.pages.dev";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Appeal Workflows — Find the Right Appeal | Appeal Mail" },
      { name: "description", content: `Browse all ${appealWorkflowCount} Appeal Mail workflows for insurance denials, Social Security and disability decisions, unemployment, government benefits, veterans benefits, and administrative appeals.` },
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
        itemListElement: Object.values(workflows).map((workflow, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: workflow.title,
          url: `${SITE_ORIGIN}/workflows/${workflow.id}`,
        })),
      }),
    }],
  }),
  component: () => <AppealWorkflowDirectory />,
});
