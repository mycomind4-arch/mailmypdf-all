import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

function RetentionPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Data Retention Policy</h1>
        <p className="mt-4 text-muted-foreground text-lg">Last updated: August 15, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-serif text-2xl text-foreground">Overview</h2>
            <p className="mt-3">
              MailMyPDF retains user data only as long as necessary to provide the service and
              comply with legal record-keeping requirements. This document describes what data we
              keep, how long we keep it, and how users can request deletion.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Unpaid Draft Orders</h2>
            <p className="mt-3">
              Draft orders (created but never paid) are automatically deleted after 24 hours. The
              uploaded PDF and all associated database records are permanently removed by an
              automated cleanup job.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Completed Orders</h2>
            <p className="mt-3">
              Paid and mailed orders are retained for 7 years from the delivery date. This retention
              period aligns with standard legal record-keeping requirements for mailed
              correspondence. Enterprise tenants can configure custom retention periods.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Audit Logs</h2>
            <p className="mt-3">
              Security and operational audit logs (rate limit hits, auth events, admin actions) are
              retained for 90 days for incident response and security investigation purposes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Rate Limit Data</h2>
            <p className="mt-3">
              Rate limiting data (IP addresses and timestamps) is auto-expired within 2 hours and
              does not persist long-term.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Your Rights</h2>
            <p className="mt-3">
              You have the right to request deletion of your data at any time. Send a deletion
              request to our support email, and we will delete all orders, PDFs, and event history
              associated with your email within 30 days of verifying your identity.
            </p>
            <p className="mt-3">
              You also have the right to export your data — including all order records, PDF
              documents, and mailing metadata.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Contact</h2>
            <p className="mt-3">
              For data retention, deletion, or export requests, contact us at the support email
              listed in the footer of this site.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute("/retention")({
  component: RetentionPolicyPage,
  head: () => ({
    title: "Data Retention Policy — MailMyPDF",
    meta: [
      { name: "description", content: "How MailMyPDF stores, retains, and deletes user data." },
    ],
  }),
});
