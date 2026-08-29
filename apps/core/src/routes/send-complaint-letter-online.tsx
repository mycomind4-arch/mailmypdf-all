import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-complaint-letter-online";
const TITLE = "Send a Complaint Letter Online | Mail a PDF Without Printing";
const DESC = "Send a complaint letter by physical mail without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-complaint-letter-online")({
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
      eyebrow={"Complaint letter"}
      h1={"Send a complaint letter online"}
      intro={"If you need to send a formal complaint by physical mail, MailMyPDF lets you upload your PDF and mail it online without a printer or post office trip."}
      whatYouCanSend={{
        heading: "Complaints people commonly mail",
        items: ["Complaints to companies", "Complaints to service providers", "Complaints to landlords", "Complaints to agencies", "Formal grievance letters", "Supporting documentation"],
      }}
      disclaimer="MailMyPDF provides printing and mailing tools only. We do not write, review, or advise on complaint letters."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
