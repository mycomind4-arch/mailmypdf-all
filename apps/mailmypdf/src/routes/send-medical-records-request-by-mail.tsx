import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-medical-records-request-by-mail";
const TITLE = "Send a Medical Records Request by Mail | MailMyPDF";
const DESC = "Upload a PDF medical records request and mail it online. MailMyPDF prints and mails your document.";

export const Route = createFileRoute("/send-medical-records-request-by-mail")({
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
      eyebrow={"Medical records request"}
      h1={"Send a medical records request by mail"}
      intro={"If you have a prepared medical records request PDF that needs to be mailed, MailMyPDF can print and send it as a physical letter."}
      whatYouCanSend={{
        heading: "Documents people commonly mail",
        items: ["Prepared medical records request forms", "HIPAA authorization forms (already prepared)", "Signed release forms", "Cover letters", "Supporting documentation", "Follow-up correspondence"],
      }}
      disclaimer="MailMyPDF is not a healthcare provider and does not provide medical, legal, or privacy advice. Users are responsible for confirming recipient requirements and mailing addresses."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
