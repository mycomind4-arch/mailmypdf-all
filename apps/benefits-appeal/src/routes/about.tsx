import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Benefits Appeal" },
      { name: "description", content: "Benefits Appeal is a MailMyPDF product that helps people respond to denied government benefits with source-grounded appeal letters." },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/about" }],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="eyebrow">About</div>
        <h1 className="mt-3 font-serif text-4xl">Benefits Appeal is a MailMyPDF product.</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We built Benefits Appeal because government benefits denials are common, confusing, and consequential. People deserve a tool that helps them understand the decision, organize their evidence, and respond — without making things worse.
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Benefits Appeal does not provide legal advice, determine eligibility, or promise outcomes. It helps you prepare a factual, source-grounded response that you review and approve before mailing. Every claim in your appeal is traced to a source document.
        </p>
      </main>
      <SiteFooter />
    </>
  ),
});
