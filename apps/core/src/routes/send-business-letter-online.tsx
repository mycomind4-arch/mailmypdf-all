import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-business-letter-online";
const TITLE = "Send a Business Letter Online | Print and Mail a PDF";
const DESC = "Send business letters online without printing them yourself. Upload a PDF, enter an address, and MailMyPDF will mail it.";

export const Route = createFileRoute("/send-business-letter-online")({
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
      eyebrow="Business letters"
      h1="Send a business letter online"
      intro="MailMyPDF helps freelancers, small businesses, and professionals send physical business letters without handling printing, envelopes, or postage."
      whatYouCanSend={{
        heading: "Business letters you can send",
        items: [
          "Client correspondence and proposals",
          "Signed contracts and agreements",
          "Invoices and payment reminders",
          "Vendor and supplier letters",
          "Cancellation and termination letters",
          "Formal notices and follow-ups",
        ],
      }}
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
