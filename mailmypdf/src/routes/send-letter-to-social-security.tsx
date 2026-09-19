import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-social-security";
const TITLE = "Send a Letter to Social Security Online | MailMyPDF";
const DESC = "Upload a PDF and send it as a physical letter to a Social Security office. MailMyPDF prints and mails your document.";

export const Route = createFileRoute("/send-letter-to-social-security")({
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
      eyebrow="Mail to Social Security"
      h1="Send a letter to Social Security online"
      intro="Need to send a physical document to a Social Security office? Upload your PDF, enter the correct mailing address, and MailMyPDF will print and mail it."
      whatYouCanSend={{
        heading: "Documents people commonly mail",
        items: [
          "Responses to Social Security notices",
          "Signed forms and appeals",
          "Supporting documentation",
          "Address or name change letters",
          "Benefit-related correspondence",
          "Requests for records",
        ],
      }}
      disclaimer="MailMyPDF is not affiliated with the Social Security Administration. We do not provide legal, benefits, or government-service advice. You are responsible for confirming the correct mailing address and requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
