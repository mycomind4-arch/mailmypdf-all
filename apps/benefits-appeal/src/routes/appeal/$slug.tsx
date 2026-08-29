import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AppealWorkflowPage } from "@/components/appeal-workflow-page";
import { APPEAL_CATALOG, getWorkflowsByCategory } from "@/domain/appeal-catalog";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

export const Route = createFileRoute("/appeal/$slug")({
  head: ({ params }) => {
    const entry = APPEAL_CATALOG.find((e) => e.slug === params.slug);
    if (!entry) return { meta: [{ name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: entry.seoTitle },
        { name: "description", content: entry.seoDescription },
        { name: "robots", content: "index,follow" },
        { property: "og:title", content: entry.seoTitle },
        { property: "og:description", content: entry.seoDescription },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Benefits Appeal" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: SITE_ORIGIN + "/appeal/" + params.slug }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Benefits Appeal", item: SITE_ORIGIN + "/" },
              { "@type": "ListItem", position: 2, name: "Workflows", item: SITE_ORIGIN + "/workflows" },
              { "@type": "ListItem", position: 3, name: entry.title, item: SITE_ORIGIN + "/appeal/" + params.slug },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What does this workflow do?",
                acceptedAnswer: { "@type": "Answer", text: "Benefits Appeal analyzes your " + entry.category.toLowerCase() + " decision, identifies the stated reasons, organizes your evidence, and helps you prepare a structured appeal. You review and approve the draft before anything is mailed." },
              },
              {
                "@type": "Question",
                name: "What documents should I provide?",
                acceptedAnswer: { "@type": "Answer", text: entry.whatYouNeed.join("; ") },
              },
              {
                "@type": "Question",
                name: "Can I change the draft?",
                acceptedAnswer: { "@type": "Answer", text: "Yes. You review the draft before anything is sent. You can edit the content, add or remove sections, and approve only when you're satisfied with the result." },
              },
              {
                "@type": "Question",
                name: "Do I have to mail it?",
                acceptedAnswer: { "@type": "Answer", text: "No. Mailing is optional. You can download the prepared document and submit it yourself, or choose Standard, Certified, or Registered mail through MailMyPDF for tracking and proof of delivery." },
              },
              {
                "@type": "Question",
                name: "Is this legal advice?",
                acceptedAnswer: { "@type": "Answer", text: "No. Benefits Appeal is a correspondence tool, not a law firm. We help you organize your documents and prepare a written appeal — we do not provide legal advice or guarantee any outcome." },
              },
            ],
          }),
        },
      ],
    };
  },
  component: () => {
    const entry = APPEAL_CATALOG.find((e) => e.slug === Route.useParams().slug);
    if (!entry) {
      return (
        <>
          <SiteHeader />
          <main className="mx-auto max-w-4xl px-4 py-16">
            <h1 className="font-serif text-3xl">Workflow not found</h1>
            <p className="mt-4 text-muted-foreground">This workflow does not exist.</p>
            <Link to="/workflows" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink">
              View all workflows
            </Link>
          </main>
          <SiteFooter />
        </>
      );
    }

    const related = getWorkflowsByCategory(entry.category)
      .filter((w) => w.slug !== entry.slug)
      .slice(0, 3)
      .map((w) => ({ slug: w.slug, title: w.title, shortDescription: w.shortDescription }));

    return <AppealWorkflowPage workflow={entry} productName="Benefits Appeal" productHomePath="/" relatedWorkflows={related} />;
  },
});
