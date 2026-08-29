import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useEffect, useRef } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getOrderByToken } from "@/lib/orders.functions";
import { trackCheckoutComplete, trackMailingSuccessful } from "@/lib/analytics-events";

type StatusKey =
  | "draft"
  | "paid"
  | "paid_pending_manual_fulfillment"
  | "manual_fulfillment_in_progress"
  | "submitted_to_provider"
  | "provider_processing"
  | "mailed"
  | "in_transit"
  | "delivered"
  | "failed"
  | "failed_fulfillment"
  | "cancelled"
  | "refunded";

const STATUS_LABEL: Record<StatusKey, string> = {
  draft: "Order created",
  paid: "Payment received",
  paid_pending_manual_fulfillment: "Payment received — preparing for mailing",
  manual_fulfillment_in_progress: "Preparing your letter",
  submitted_to_provider: "Submitted for mailing",
  provider_processing: "Preparing your letter",
  mailed: "Mailed",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Something went wrong",
  failed_fulfillment: "Needs review",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const Route = createFileRoute("/orders/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
    paid: search.paid === "1" || search.paid === 1,
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
        <Suspense fallback={<LoadingBlock />}>
          <OrderBody id={id} token={token} paid={paid} />
        </Suspense>
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
  const { data } = useSuspenseQuery({
    queryKey: ["order", id, token],
    queryFn: () => getOrder({ data: { id, token } }),
    retry: false,
    // Poll every 2s while we're waiting for the webhook to confirm payment.
    refetchInterval: (q) => {
      const s = (q.state.data as { order?: { status?: string } } | undefined)?.order?.status;
      if (paid && s === "draft") return 2000;
      return false;
    },
  });

  const { order, events } = data;
  const status = order.status as StatusKey;

  // Track checkout completion — fires once per page mount when payment confirmed
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (paid && status !== "draft" && status !== "cancelled" && !checkoutTracked.current) {
      checkoutTracked.current = true;
      void trackCheckoutComplete(order.id, 0);
    }
  }, [paid, status, order.id]);

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
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">
        {status === "failed" ? "There was a problem" : "Your letter is on its way"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Bookmark this page — the link in the URL is the only way back in.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="envelope-card envelope-card-notch p-8">
          <StatusBadge status={status} />
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Document
              </div>
              <div className="mt-1 font-serif text-xl">{order.file_name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {order.page_count} page{order.page_count === 1 ? "" : "s"} · b/w
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Mailed to
              </div>
              <div className="mt-1 font-serif text-xl">{order.recipient_name}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {order.recipient_city}, {order.recipient_state}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Price
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

          <div className="mt-8 flex flex-wrap gap-3 border-t border-dashed border-rule pt-6">
            <Link
              to="/send"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt/90"
            >
              Send another letter
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
            {status !== "mailed" && status !== "delivered" && status !== "failed" && (
              <li className="relative pl-6 opacity-50">
                <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full border border-rule" />
                <div className="font-serif text-base">Mailed</div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Pending
                </div>
              </li>
            )}
          </ol>
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-cobalt/30 bg-cobalt/8 px-4 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cobalt opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cobalt" />
      </span>
      <span className="font-mono text-xs uppercase tracking-widest text-cobalt">
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}
