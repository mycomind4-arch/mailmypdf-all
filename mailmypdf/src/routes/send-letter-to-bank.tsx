import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-bank";
const TITLE = "Send a Letter to Your Bank Online | Print and Mail a PDF";
const DESC = "Mail signed forms and letters to your bank without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-bank")({
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
      eyebrow="Mail to a bank"
      h1="Send a letter to your bank online"
      intro="Banks and credit unions often require a signed letter by mail. MailMyPDF prints and mails your PDF so you don't need a printer or a trip to the branch."
      whatYouCanSend={{
        heading: "Common bank letters",
        items: [
          "Account closure requests",
          "Dispute and chargeback letters",
          "Signed forms and authorizations",
          "Beneficiary or address changes",
          "Loan and mortgage correspondence",
          "Responses to bank notices",
        ],
      }}
      disclaimer="MailMyPDF is not a bank and does not provide financial or legal advice. You are responsible for confirming the correct mailing address and any requirements your bank has for signed correspondence."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
