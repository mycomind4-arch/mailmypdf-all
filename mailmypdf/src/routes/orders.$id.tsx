import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { mailingStatus } from "@mailmypdf/workflow-ui";
import { MailingRecordDownloads } from "@/components/mailing-record-downloads";
import { getOrderByToken } from "@/lib/orders.functions";
import { trackCheckoutComplete, trackMailingSuccessful } from "@/lib/analytics-events";

interface OrderPageData {
  order: {
    id: string;
    status: string;
    mail_class?: string | null;
    created_at: string;
    file_name: string;
    page_count: number;
    recipient_name: string;
    recipient_city: string;
    recipient_state: string;
    price_cents: number;
    color?: boolean;
  };
  events: Array<{ type: string; label: string; created_at: string; metadata?: unknown }>;
}

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    paid: search.paid === "1" || search.paid === 1 || search.paid === true,
  }),
  head: () => ({
    meta: [{ title: "Your MailMyPDF order" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { token, paid } = Route.useSearch();

  if (!token) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <div className="postmark mx-auto w-fit">Link needed</div>
          <h1 className="mt-4 font-serif text-4xl">This order needs its private link.</h1>
          <p className="mt-3 text-muted-foreground">
            Open the exact link from your confirmation email — it includes a token that unlocks this
            page.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <OrderBody id={id} token={token} paid={paid} />
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="envelope-card p-10 text-center text-muted-foreground">
      <div className="postmark mx-auto w-fit">Loading</div>
      <p className="mt-4 font-serif text-xl">Pulling up your order…</p>
    </div>
  );
}

function OrderBody({ id, token, paid }: { id: string; token: string; paid: boolean }) {
  const getOrder = useServerFn(getOrderByToken);
  const query = useQuery<OrderPageData>({
    queryKey: ["order", id, token],
    queryFn: async () => (await getOrder({ data: { id, token } })) as OrderPageData,
    retry: false,
    // Poll every 2s while we're waiting for the webhook to confirm payment.
    refetchInterval: (q) => {
      const s = (q.state.data as { order?: { status?: string } } | undefined)?.order?.status;
      if (paid && s && mailingStatus(s).awaitingPayment && q.state.dataUpdateCount < 30)
        return 2000;
      return false;
    },
  });

  if (query.isPending) return <LoadingBlock />;
  if (query.isError)
    return (
      <div role="alert" className="envelope-card p-8">
        <h1 className="font-serif text-3xl">We couldn’t load this order</h1>
        <p className="mt-3">
          Check your private confirmation link, or try again. Do not create a second order to
          resolve a tracking error.
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-4 text-cobalt underline"
        >
          Try again
        </button>
      </div>
    );
  return (
    <OrderDetails
      data={query.data}
      token={token}
      paid={paid}
      refresh={() => void query.refetch()}
    />
  );
}

function OrderDetails({
  data,
  token,
  paid,
  refresh,
}: {
  data: OrderPageData;
  token: string;
  paid: boolean;
  refresh: () => void;
}) {
  const { order, events } = data;
  const status = order.status;
  const view = mailingStatus(status);

  // Track checkout completion — fires once per page mount when payment confirmed
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (paid && view.paymentConfirmed && !checkoutTracked.current) {
      checkoutTracked.current = true;
      void trackCheckoutComplete(order.id, 0);
    }
  }, [paid, view.paymentConfirmed, order.id]);

  // Track mailing success — fires once per page mount when order has been mailed
  // Authoritative transition: provider_processing → mailed (triggered by Lob webhook)
  // We observe this client-side when the user views an order that has been mailed
  const mailingTracked = useRef(false);
  useEffect(() => {
    if (
      (status === "mailed" || status === "in_transit" || status === "delivered") &&
      !mailingTracked.current
    ) {
      mailingTracked.current = true;
      void trackMailingSuccessful(order.id, order.mail_class ?? "standard");
    }
  }, [status, order.id, order.mail_class]);
  const createdAt = new Date(order.created_at).toLocaleString();

  return (
    <>
      <div className="postmark w-fit">Order #{order.id.slice(0, 8).toUpperCase()}</div>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">{view.label}</h1>
      <p className="mt-2 text-muted-foreground">
        Keep this private link safe. Anyone with the link can access this order.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="envelope-card envelope-card-notch p-8">
          <p className="text-sm text-muted-foreground">{view.message}</p>
          <button type="button" onClick={refresh} className="mt-3 text-sm text-cobalt underline">
            Refresh status
          </button>
          {view.needsAttention && (
            <p className="mt-3 text-sm">
              <Link to="/contact" className="text-cobalt underline">
                Contact support
              </Link>{" "}
              and include order #{order.id.slice(0, 8).toUpperCase()}.
            </p>
          )}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Document
              </div>
              <div className="mt-1 font-serif text-xl">{order.file_name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {order.page_count} page{order.page_count === 1 ? "" : "s"} ·{" "}
                {order.color ? "color" : "black and white"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Recipient
              </div>
              <div className="mt-1 font-serif text-xl">{order.recipient_name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {order.recipient_city}, {order.recipient_state}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Recorded order amount
              </div>
              <div className="mt-1 font-serif text-xl">${(order.price_cents / 100).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Placed
              </div>
              <div className="mt-1 font-mono text-sm" suppressHydrationWarning>
                {createdAt}
              </div>
            </div>
          </div>

          <MailingRecordDownloads id={order.id} token={token} />
          <div className="mt-8 flex flex-wrap gap-3 border-t border-dashed border-rule pt-6">
            <Link
              to="/send"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt/90"
            >
              Start a new mailing
            </Link>
          </div>
        </div>

        <div className="envelope-card p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Timeline
          </div>
          <ol className="mt-4 space-y-4">
            {events.map((e, i) => (
              <li key={i} className="relative pl-6">
                <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-cobalt" />
                <div className="font-serif text-base">{e.label}</div>
                <div
                  className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </li>
            ))}
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">No events are available yet.</li>
            )}
          </ol>
        </div>
      </div>
    </>
  );
}
