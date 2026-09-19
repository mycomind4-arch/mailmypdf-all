import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-irs";
const TITLE = "Send a Letter to the IRS Online | Print and Mail Your PDF";
const DESC = "Need to mail a document to the IRS? Upload your PDF, enter the correct IRS mailing address, and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-irs")({
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
      eyebrow="Mail to the IRS"
      h1="Send a letter to the IRS online"
      intro="If you already have a PDF that needs to be mailed to the IRS, MailMyPDF can help you print and mail it from your browser."
      whatYouCanSend={{
        heading: "Documents people commonly mail to the IRS",
        items: [
          "Responses to IRS notices",
          "Amended returns and attachments",
          "Signed forms and schedules",
          "Payment vouchers",
          "Requests for correspondence",
          "Supporting documentation",
        ],
      }}
      disclaimer="MailMyPDF is not affiliated with the IRS. We do not provide tax advice, verify IRS mailing addresses, or guarantee that any document will be accepted. You are responsible for confirming the correct IRS address, deadline, and requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
