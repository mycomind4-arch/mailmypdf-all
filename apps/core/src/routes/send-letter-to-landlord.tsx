import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-landlord";
const TITLE = "Send a Letter to a Landlord Online | MailMyPDF";
const DESC = "Send a physical letter to your landlord without a printer or post office. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-landlord")({
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
      eyebrow="Mail to a landlord"
      h1="Send a letter to a landlord online"
      intro="If you need to send a written letter to a landlord, MailMyPDF helps you print and mail your PDF from your browser."
      whatYouCanSend={{
        heading: "Letters people commonly send",
        items: [
          "Notice to vacate letters",
          "Maintenance and repair requests",
          "Lease-related correspondence",
          "Security deposit letters",
          "Rent or payment letters",
          "Move-in and move-out notices",
        ],
      }}
      disclaimer="MailMyPDF does not provide legal advice or determine whether a letter satisfies any lease, notice, or legal requirement. You are responsible for reviewing your document and mailing requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
