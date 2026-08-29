import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-tenant";
const TITLE = "Send a Letter to a Tenant Online | Print and Mail Notices";
const DESC = "Mail notices, rent reminders, and lease letters to tenants without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-tenant")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PATH },
    ],
    links: [{ rel: "canonical", href: PATH }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(DEFAULT_FAQ_LIST)) }],
  }),
  component: () => (
    <SeoLandingPage
      eyebrow="Mail to a tenant"
      h1="Send a letter to a tenant online"
      intro="Landlords and property managers can use MailMyPDF to send physical notices and letters to tenants without printing at home or visiting a post office."
      whatYouCanSend={{
        heading: "Common tenant letters",
        items: [
          "Rent reminders and late notices",
          "Lease renewal offers",
          "Notice of entry",
          "Move-out and security deposit letters",
          "Rule and policy updates",
          "General correspondence",
        ],
      }}
      disclaimer="MailMyPDF is not a law firm and does not provide legal advice. Landlord–tenant notices are subject to state and local law. You are responsible for the content of your letter and confirming any required delivery method (such as certified mail) in your jurisdiction."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
