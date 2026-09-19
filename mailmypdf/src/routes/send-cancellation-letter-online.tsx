import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-cancellation-letter-online";
const TITLE = "Send a Cancellation Letter Online | Print and Mail Your PDF";
const DESC = "Need to mail a cancellation letter? Upload your PDF and MailMyPDF will print and mail it as a physical letter.";

export const Route = createFileRoute("/send-cancellation-letter-online")({
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
      eyebrow={"Cancellation letter"}
      h1={"Send a cancellation letter online"}
      intro={"MailMyPDF helps you send a cancellation letter as physical mail from your browser. Upload your prepared PDF, enter the recipient address, and we'll print and mail it."}
      whatYouCanSend={{
        heading: "Cancellations people commonly mail",
        items: ["Subscription cancellation letters", "Membership cancellation letters", "Account closure letters", "Service cancellation notices", "Contract cancellation letters", "Recurring-billing cancellations"],
      }}
      disclaimer="MailMyPDF does not provide legal advice or determine whether a cancellation letter satisfies any contract, account, or notice requirement."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
