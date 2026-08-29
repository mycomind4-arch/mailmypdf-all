import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "Terms of Service — Immigration Mail" },
    { name: "description", content: "Terms of service for Immigration Mail." },
  ],
    links: [{ rel: "canonical", href: "https://immigrationmail.com/terms" }],  }),
  component: TermsPage,
});

const sections = [
  { title: "Acceptance of Terms", body: "By using Immigration Mail, you agree to these Terms of Service." },
  { title: "Description of Service", body: "Immigration Mail provides guided workflows for preparing immigration correspondence and physical mailing services via USPS." },
  { title: "Not Legal Advice", body: "Immigration Mail is not a law firm. We do not provide legal advice or representation. The AI assistant organizes information you provide but does not invent facts or draw legal conclusions." },
  { title: "User Responsibilities", body: "You are responsible for the accuracy of all information. You must review every draft before approving it for mailing." },
  { title: "Acceptable Use", body: "You agree not to use Immigration Mail to send fraudulent or misleading correspondence." },
  { title: "Payment & Refunds", body: "Payment is processed via Stripe before mailing. Refunds are available if the mailing hasn't been submitted for processing." },
  { title: "Limitation of Liability", body: "Immigration Mail is provided 'as is.' Our liability is limited to the cost of the mailing service." },
  { title: "Contact", body: "For questions about these terms, contact us at support@immigrationmail.app." },
];

function TermsPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-paper-deep">
            <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
          </div>
        </div>
        <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
          <strong>Important:</strong> Immigration Mail is not a law firm and does not provide legal advice.
        </div>
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-serif text-xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
