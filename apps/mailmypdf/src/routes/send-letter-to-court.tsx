import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-court";
const TITLE = "Send a Letter to a Court by Mail | MailMyPDF";
const DESC = "Upload a court letter or filing as a PDF and MailMyPDF will print and mail it to the court's address.";

export const Route = createFileRoute("/send-letter-to-court")({
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
      eyebrow="Mail to a court"
      h1="Send a letter to a court by mail"
      intro="If you already have a letter, response, or correspondence prepared as a PDF for a court, MailMyPDF can print and mail it for you."
      whatYouCanSend={{
        heading: "Common court correspondence",
        items: [
          "Letters to a judge or clerk",
          "Responses to court notices",
          "Jury duty correspondence",
          "Continuance and rescheduling requests",
          "Supporting documentation",
          "Signed forms and attachments",
        ],
      }}
      disclaimer="MailMyPDF is not a law firm and does not provide legal advice. We do not verify court filing requirements, deadlines, or acceptable delivery methods. Formal court filings usually have strict rules — consult a licensed attorney or the court clerk before sending anything time-sensitive."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
