import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-letter-to-insurance-company";
const TITLE = "Send a Letter to an Insurance Company | MailMyPDF";
const DESC = "Mail claims, appeals, and cancellation letters to insurance companies. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-letter-to-insurance-company")({
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
      eyebrow="Mail to insurance"
      h1="Send a letter to an insurance company"
      intro="Insurance carriers still process many requests by physical mail. MailMyPDF lets you upload your PDF and mail it to the carrier without a printer."
      whatYouCanSend={{
        heading: "Common insurance letters",
        items: [
          "Claim submissions and supporting documents",
          "Appeal letters after a denial",
          "Cancellation and non-renewal notices",
          "Beneficiary and policy change forms",
          "Responses to carrier correspondence",
          "Signed authorizations",
        ],
      }}
      disclaimer="MailMyPDF is not an insurance provider and does not offer insurance, legal, or medical advice. You are responsible for confirming the carrier's mailing address and any deadlines or required delivery methods."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
