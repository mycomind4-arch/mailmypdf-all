import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | MailMyPDF" },
      { name: "description", content: "How MailMyPDF handles your data, documents, and mailing records." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="postmark w-fit">MailMyPDF / Privacy</div>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: September 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-serif text-xl text-foreground">What we collect</h2>
            <p className="mt-3">When you use MailMyPDF, we collect the minimum information needed to perform the workflow you request. This can include your account email and profile name, sender and recipient mailing addresses, documents and attachments you ask us to process, workflow facts you provide, document-analysis results, drafts and packet metadata, approval records, order and payment status, and mailing or tracking records. Payment processing is handled by Stripe; MailMyPDF does not receive or store your full card number or CVC.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">How we use your data</h2>
            <p className="mt-3">We use this data to authenticate your account, securely ingest and scan documents, run the document workflow you requested, analyze source material when a workflow requires it, generate and save reviewable drafts, construct and price mailing packets, record your explicit approval, prepare secure checkout, fulfill paid mailing orders, provide status and tracking, prevent abuse, and support your account. With your opt-in, we may collect analytics to improve the product. We do not sell your personal data.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Document retention</h2>
            <p className="mt-3">Documents, workflow records, approvals, and mailing records are retained only for the periods described in our <a href="/retention" className="text-cobalt hover:underline">Data Retention Policy</a>, including the periods needed to operate active matters, fulfill orders, provide proof and support, prevent abuse, and meet applicable recordkeeping obligations. When a retention period ends, data covered by that schedule is deleted or de-identified as described there. You can request deletion at any time, subject to security, fulfillment, dispute, and legal recordkeeping requirements.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Connected AI assistants</h2>
            <p className="mt-3">If you connect MailMyPDF to an AI assistant or other MCP-compatible client, that client may send MailMyPDF the tool inputs needed for the action you request, including temporary attachment download information when you ask us to process a file. MailMyPDF returns only the workflow result needed to continue the requested task. Account connection does not authorize packet approval, payment, or mailing; those remain separate actions. The connected assistant provider processes your conversation and its copy of tool inputs and results under its own terms and privacy policy.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Third-party services</h2>
            <p className="mt-3">We use service providers to operate MailMyPDF, including Stripe for payments, Lob or an equivalent provider for print-and-mail fulfillment, Cloudflare for hosting and network services, Supabase for database and authentication, and configured AI model providers for workflows that require document analysis or draft generation. When you use MailMyPDF through a connected AI assistant, the assistant provider also participates in the interaction as described above. We disclose only the data reasonably necessary for the applicable service or workflow.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Your rights</h2>
            <p className="mt-3">You can request access to, correction of, or deletion of your personal data at any time by contacting <a href="mailto:hello@mailmypdf.ai" className="text-cobalt hover:underline">hello@mailmypdf.ai</a>. If you are in the EU or California, you have additional rights under GDPR and CCPA respectively.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Analytics opt-in</h2>
            <p className="mt-3">MailMyPDF asks for your consent before collecting analytics. Essential storage is required for the service to function. Analytics and personalization are optional — you can use the service fully without opting in.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Contact</h2>
            <p className="mt-3">Questions about privacy? Email <a href="mailto:hello@mailmypdf.ai" className="text-cobalt hover:underline">hello@mailmypdf.ai</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
