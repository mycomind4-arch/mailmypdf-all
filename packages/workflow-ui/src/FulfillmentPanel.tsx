import type { ReactNode } from "react";
import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export type FulfillmentPhase =
  | "review"
  | "recipient"
  | "quote"
  | "payment"
  | "submitting"
  | "submitted"
  | "tracking"
  | "delivered"
  | "returned"
  | "error";

export interface FulfillmentDetail {
  label: string;
  value: ReactNode;
}

export interface FulfillmentPanelProps {
  phase: FulfillmentPhase;
  title?: string;
  description?: string;
  details?: FulfillmentDetail[];
  providerReference?: string | null;
  trackingNumber?: string | null;
  error?: string | null;
  children?: ReactNode;
  actions?: ReactNode;
}

function phaseTone(phase: FulfillmentPhase): StatusPillTone {
  if (phase === "delivered" || phase === "submitted" || phase === "tracking") return "success";
  if (phase === "returned" || phase === "error") return "danger";
  if (phase === "submitting" || phase === "payment") return "warning";
  return "info";
}

/**
 * Presentation shell for shared payment/mailing/proof states, extracted from
 * Notice Respond's MailingFunnel and Private Office's Mail step. Network and
 * provider calls intentionally remain outside this component.
 */
export function FulfillmentPanel({
  phase,
  title = "Mailing and proof",
  description = "Review fulfillment status, delivery details, and proof records for this packet.",
  details = [],
  providerReference,
  trackingNumber,
  error,
  children,
  actions,
}: FulfillmentPanelProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={<StatusPill tone={phaseTone(phase)} label={phase.replaceAll("-", " ")} />}
      footer={actions}
    >
      {details.length > 0 && (
        <dl className="wf-fulfillment-details">
          {details.map((item) => (
            <div key={item.label} className="wf-fulfillment-detail">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(providerReference || trackingNumber) && (
        <div className="wf-fulfillment-reference-grid">
          {providerReference && (
            <div className="wf-fulfillment-reference">
              <span>Provider reference</span>
              <strong>{providerReference}</strong>
            </div>
          )}
          {trackingNumber && (
            <div className="wf-fulfillment-reference">
              <span>Tracking</span>
              <strong>{trackingNumber}</strong>
            </div>
          )}
        </div>
      )}
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}
      {children}
    </SectionCard>
  );
}
