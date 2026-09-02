/**
 * Checkout Success Page
 *
 * Displayed after Stripe payment succeeds.
 * Shows order confirmation and tracking information.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, FileText, Mail, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getOrderAfterPayment } from "@/lib/checkout.functions";

export const Route = createFileRoute("/checkout/success")({
  parseParams: (params) => ({
    orderId: params.orderId as string,
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { orderId } = Route.useSearch();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order-confirmation", orderId],
    queryFn: () => getOrderAfterPayment.fetch({ orderId }),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-rule border-t-cobalt animate-spin mx-auto mb-4" />
          <p className="text-ink-soft">Processing order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="rounded-lg border border-rule/60 bg-card p-12 text-center max-w-md">
          <p className="font-medium text-red-600">Order Not Found</p>
          <p className="text-sm text-ink-soft mt-2 mb-4">
            We couldn't find your order. Please check your email for confirmation.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
          >
            Return Home <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-50 border-2 border-green-200 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="font-serif text-3xl mb-2">Payment Confirmed!</h1>
          <p className="text-ink-soft">Your mailing has been paid and will be processed.</p>
        </div>

        {/* Order Details */}
        <div className="rounded-lg border border-rule/60 bg-card p-8 space-y-6 mb-8">
          {/* Order Number */}
          <div className="flex items-center justify-between pb-6 border-b border-rule/60">
            <div>
              <p className="text-xs text-ink-soft mb-1">Order Number</p>
              <p className="font-mono text-sm font-medium break-all">{order.id}</p>
            </div>
            <Mail className="h-6 w-6 text-brass" />
          </div>

          {/* Amount Paid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-soft mb-1">Amount Paid</p>
              <p className="font-serif text-2xl">${(order.total / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft mb-1">Date</p>
              <p className="font-medium">{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="pt-6 border-t border-rule/60">
            <p className="text-xs text-ink-soft mb-4 font-medium uppercase tracking-wide">
              Status & Timeline
            </p>
            <div className="space-y-3">
              <StatusStep
                title="Payment Confirmed"
                description="Your payment was received"
                timestamp={order.createdAt}
                active
              />
              <StatusStep
                title="Documents Processing"
                description="Our team is preparing your mailing"
                timestamp={null}
                pending
              />
              <StatusStep
                title="Mail Sent"
                description="Your documents are on their way"
                timestamp={order.mailedAt}
              />
              <StatusStep
                title="Delivery"
                description="Recipient receives your mailing"
                timestamp={null}
              />
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="rounded-lg border border-brass/20 bg-brass/5 p-6 mb-8">
          <h2 className="font-serif text-lg mb-4">What Happens Next?</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brass/20 flex items-center justify-center text-xs font-medium text-brass">
                1
              </span>
              <p>
                Our team will review your documents and verify all information
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brass/20 flex items-center justify-center text-xs font-medium text-brass">
                2
              </span>
              <p>
                Your mailing will be processed and sent via certified mail within 2-3 business days
              </p>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brass/20 flex items-center justify-center text-xs font-medium text-brass">
                3
              </span>
              <p>
                You'll receive tracking information and proof of delivery once mailed
              </p>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to="/workspace"
            className="block text-center py-3 px-4 rounded-full bg-cobalt text-white font-medium hover:bg-cobalt/90 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="block text-center py-3 px-4 rounded-full border border-rule bg-card text-ink font-medium hover:bg-paper-deep transition-colors"
          >
            Start New Mailing
          </Link>
        </div>

        {/* Email Confirmation */}
        <p className="text-xs text-ink-soft text-center mt-8">
          A confirmation email has been sent to <code className="font-mono">{order.metadata?.email || "your email"}</code>
        </p>
      </div>
    </div>
  );
}

interface StatusStepProps {
  title: string;
  description: string;
  timestamp?: string | null;
  active?: boolean;
  pending?: boolean;
}

function StatusStep({ title, description, timestamp, active, pending }: StatusStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full ${
            active
              ? "bg-green-600"
              : pending
                ? "bg-amber-600"
                : timestamp
                  ? "bg-cobalt"
                  : "bg-rule/40"
          }`}
        />
        <div className="w-0.5 h-8 bg-rule/20 mt-2" />
      </div>
      <div className="pb-8">
        <p className={`font-medium ${active ? "text-green-600" : pending ? "text-amber-600" : timestamp ? "text-cobalt" : "text-ink-soft"}`}>
          {title}
        </p>
        <p className="text-sm text-ink-soft">{description}</p>
        {timestamp && (
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}
