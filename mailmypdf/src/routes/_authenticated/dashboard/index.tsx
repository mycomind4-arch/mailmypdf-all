import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { mailingStatus } from "@mailmypdf/workflow-ui";
import { getUserOrders } from "@/lib/user.functions";
import { authenticatedHeaders } from "@/lib/authenticated-client";
import { FileUp, PenLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [{ title: "MailMyPDF — Your Mail Desk" }, { name: "robots", content: "noindex" }],
  }),
  component: MailDesk,
});

function MailDesk() {
  const getOrders = useServerFn(getUserOrders);
  const query = useQuery({
    queryKey: ["mail-desk-orders"],
    queryFn: async () =>
      getOrders({ data: { page: 1, limit: 50 }, headers: await authenticatedHeaders() }),
    retry: false,
  });
  const orders = query.data?.orders ?? [];
  const attention = orders.filter((order) => mailingStatus(order.status).needsAttention);
  return (
    <div className="space-y-8 pb-10">
      <section className="envelope-card p-6 sm:p-9">
        <p className="eyebrow">Your Mail Desk</p>
        <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-5xl">
          What do you need to send?
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Bring your PDF or start a letter. Review every page, choose your mailing options, and see
          the full price before you pay.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link
            to="/send"
            className="flex items-start gap-4 rounded-lg border border-cobalt bg-cobalt p-5 text-white hover:bg-cobalt/90"
          >
            <FileUp className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-serif text-2xl">Send a PDF</span>
              <span className="mt-1 block text-sm">
                Choose or drop your file on the next screen.
              </span>
            </span>
          </Link>
          <Link
            to="/write"
            search={{ template: undefined }}
            className="flex items-start gap-4 rounded-lg border border-rule p-5 hover:bg-paper"
          >
            <PenLine className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-serif text-2xl">Write a letter</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Start with your own words or a template.
              </span>
            </span>
          </Link>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Review → approve → pay → track. Opening a workflow does not send a mailing.
        </p>
      </section>
      <section className="envelope-card p-6 sm:p-7" aria-labelledby="mailings-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mailings-heading" className="font-serif text-2xl">
            Your mailings
          </h2>
          <Link to="/dashboard/orders" className="text-sm text-cobalt underline">
            View all orders →
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Recent orders beyond the initial draft stage. Unsubmitted work is not saved here.
        </p>
        {query.isPending && (
          <p role="status" className="py-8 text-muted-foreground">
            Loading your mailings…
          </p>
        )}
        {query.isError && (
          <div role="alert" className="mt-5 rounded-lg border border-rule p-5">
            <p>We couldn’t load your mailings. Your documents have not been changed.</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-3 text-cobalt underline"
            >
              Try again
            </button>
          </div>
        )}
        {query.isSuccess && orders.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-rule p-6">
            <h3 className="font-serif text-xl">Your first mailing starts here.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose “Send a PDF” or “Write a letter” above. You’ll review the document, addresses,
              and price before checkout.
            </p>
          </div>
        )}
        {attention.length > 0 && (
          <div className="mt-5 rounded-lg border border-rule bg-paper p-4">
            <h3 className="font-medium">Needs attention · {attention.length}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Among your latest {orders.length} orders. Open the record before retrying a payment or
              mailing.
            </p>
            <ul className="mt-3 space-y-2">
              {attention.map((order) => (
                <li key={order.id}>
                  <Link
                    to="/orders/$id"
                    params={{ id: order.id }}
                    search={{ token: order.lookup_token, paid: false }}
                    className="text-sm text-cobalt underline"
                  >
                    {order.file_name || "Letter"} · {mailingStatus(order.status).label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="mt-5 divide-y divide-rule">
          {orders.slice(0, 6).map((order) => (
            <li key={order.id} className="py-4">
              <Link
                to="/orders/$id"
                params={{ id: order.id }}
                search={{ token: order.lookup_token, paid: false }}
                className="flex flex-wrap items-start justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block break-words font-medium">
                    {order.file_name || "Letter"}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {order.recipient_name} · {order.recipient_city}, {order.recipient_state}
                  </span>
                </span>
                <span className="text-sm text-cobalt">{mailingStatus(order.status).label} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl">Keep the mailing record</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open an order for its recorded status, history, and available downloads. Missing
            receipts or delivery evidence are never presented as proof.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-xl">Need a specialized workflow?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your existing tools are still available.
          </p>
          <Link
            to="/dashboard/workflows"
            className="mt-3 inline-block text-sm text-cobalt underline"
          >
            Explore workflows →
          </Link>
        </div>
      </section>
    </div>
  );
}
