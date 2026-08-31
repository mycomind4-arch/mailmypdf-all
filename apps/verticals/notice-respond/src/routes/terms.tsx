import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Notice Respond" }, { name: "description", content: "Terms of service for Notice Respond." }] }),
  component: TermsPage,
});

const sections = [
  { title: "Acceptance of Terms", body: "By using Notice Respond, you agree to these Terms of Service." },
  { title: "Description of Service", body: "Notice Respond provides guided workflows for preparing responses to government notices and physical mailing services via USPS." },
  { title: "Not Legal Advice", body: "Notice Respond is not a law firm, CPA firm, or government agency. We do not provide legal or tax advice or representation. The AI assistant organizes information you provide but does not invent facts or draw legal conclusions." },
  { title: "User Responsibilities", body: "You are responsible for the accuracy of all information. You must review every draft before approving it for mailing." },
  { title: "Acceptable Use", body: "You agree not to use Notice Respond to send fraudulent or misleading correspondence." },
  { title: "Payment & Refunds", body: "Payment is processed via Stripe before mailing. Refunds are available if the mailing hasn't been submitted for processing." },
  { title: "Limitation of Liability", body: "Notice Respond is provided 'as is.' Our liability is limited to the cost of the mailing service." },
  { title: "Contact", body: "For questions about these terms, contact us at support@noticerespond.app." },
];

function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-paper-deep"><svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg></div><div><h1 className="font-serif text-3xl">Terms of Service</h1><p className="text-sm text-muted-foreground">Last updated: August 2026</p></div></div>
        <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground"><strong>Important:</strong> Notice Respond is not a law firm, CPA firm, or government agency and does not provide legal or tax advice.</div>
        <div className="mt-8 space-y-6">{sections.map((s) => (<div key={s.title}><h2 className="font-serif text-xl">{s.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{s.body}</p></div>))}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
