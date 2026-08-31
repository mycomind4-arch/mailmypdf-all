/**
 * Shared Loading / Error / Empty State Components
 *
 * Verticals and core pages reuse these instead of each creating
 * their own error states. Consistent visual language across the app.
 */

import { type ReactNode } from "react";

// ── Loading State ────────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading…", sublabel }: { label?: string; sublabel?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

// ── AI Processing State ────────────────────────────────────────────────────────

export function AIProcessingState({ label = "AI is analyzing your documents…", sublabel }: { label?: string; sublabel?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-16">
      <div className="relative">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Error States ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

export function ErrorState({ title, message, action, children }: ErrorStateProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
        <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted-foreground">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-md bg-cobalt px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cobalt/90"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

export function UploadErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Upload failed"
      message="We couldn't process your file. Make sure it's a valid PDF under 10MB and try again."
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}

export function ValidationErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <ErrorState
      title="Something needs your attention"
      message={message ?? "Please review the highlighted fields and try again."}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}

export function PaymentErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <ErrorState
      title="Payment failed"
      message={message ?? "Your payment couldn't be processed. Please try again or use a different card."}
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}

export function FulfillmentErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Mailing failed"
      message="We couldn't submit your mail piece to our print provider. Our team has been notified — try again or contact support."
      action={onRetry ? { label: "Try again", onClick: onRetry } : undefined}
    />
  );
}

// ── Provider Delay State ───────────────────────────────────────────────────────

export function ProviderDelayState({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 py-8 text-center">
      <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <p className="text-sm font-medium text-foreground">Waiting for an update from the mail provider</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {message ?? "This can take a few hours. We'll update this page automatically when tracking information arrives."}
      </p>
    </div>
  );
}

// ── Tracking Unavailable ─────────────────────────────────────────────────────────

export function TrackingUnavailableState() {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 py-8 text-center">
      <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.625a2.625 2.625 0 0 1-2.625 2.375H5.625a2.625 2.625 0 0 1-2.625-2.375L2.25 7.5m18 0H2.25m18 0-1.875-3A2.625 2.625 0 0 0 16.5 3h-9a2.625 2.625 0 0 0-2.187 1.5L3.375 7.5" />
      </svg>
      <p className="text-sm font-medium text-foreground">Tracking unavailable</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Tracking information isn't available yet. Check back in a few hours, or use your order lookup token.
      </p>
    </div>
  );
}

// ── Unauthorized / Not Found ─────────────────────────────────────────────────────

export function UnauthorizedState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-muted/50">
        <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">You don't have access to this page</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Sign in with an authorized account, or go back to the home page.
      </p>
    </div>
  );
}

export function NotFoundState({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-muted bg-muted/50">
        <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">Not found</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {message ?? "The page you're looking for doesn't exist or has been moved."}
      </p>
    </div>
  );
}
