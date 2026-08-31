import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-demand-letter-online";
const TITLE = "Send a Demand Letter Online | Print and Mail Your PDF";
const DESC = "Upload your demand letter PDF and MailMyPDF will print and mail it. No printer, envelope, or post office visit required.";

export const Route = createFileRoute("/send-demand-letter-online")({
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
      eyebrow="Demand letter"
      h1="Send a demand letter online"
      intro="If you already have a demand letter written as a PDF, MailMyPDF can print and mail it to the recipient so you don't have to handle printing or postage."
      whatYouCanSend={{
        heading: "Common demand letters",
        items: [
          "Unpaid invoice and payment demands",
          "Security deposit return requests",
          "Contract breach notices",
          "Refund and chargeback demands",
          "Small claims pre-suit letters",
          "Personal loan repayment requests",
        ],
      }}
      disclaimer="MailMyPDF is not a law firm and does not provide legal advice. Demand letters can have legal consequences; consult a licensed attorney if you're unsure. Some situations may require certified mail — you are responsible for choosing the correct delivery method."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
