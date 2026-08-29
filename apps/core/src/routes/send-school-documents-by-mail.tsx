import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage, DEFAULT_FAQ_LIST, faqJsonLd } from "@/components/seo-landing";
import { relatedFor } from "@/lib/seo-pages";

const PATH = "/send-school-documents-by-mail";
const TITLE = "Send School Documents by Mail Online | MailMyPDF";
const DESC = "Mail school documents online without a printer. Upload your PDF and MailMyPDF will print and mail it.";

export const Route = createFileRoute("/send-school-documents-by-mail")({
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
      eyebrow={"School documents"}
      h1={"Send school documents by mail online"}
      intro={"Need to mail school documents or forms? MailMyPDF helps you upload your PDF and send it as a physical letter online."}
      whatYouCanSend={{
        heading: "School documents people mail",
        items: ["Admissions paperwork", "Registrar forms", "Enrollment documents", "Financial aid letters", "Transcript request letters", "Supporting documentation"],
      }}
      disclaimer="MailMyPDF is not affiliated with any school, university, or education office. Users are responsible for confirming mailing addresses and document requirements."
      relatedLinks={relatedFor(PATH)}
    />
  ),
});
