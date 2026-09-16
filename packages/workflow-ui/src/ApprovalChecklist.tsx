import { useMemo, useState } from "react";
import { CheckboxField } from "./FormFields";
import { SectionCard } from "./SectionCard";
import { StatusPill, type StatusPillTone } from "./StatusPill";

export interface ApprovalReviewItem {
  id: string;
  label: string;
  detail?: string;
  status: string;
  tone?: StatusPillTone;
}

export interface ApprovalConfirmation {
  id: string;
  label: string;
}

export interface ApprovalChecklistProps {
  title?: string;
  description?: string;
  reviewItems: ApprovalReviewItem[];
  confirmations: ApprovalConfirmation[];
  approveLabel?: string;
  onApprove?: () => void | Promise<void>;
}

/**
 * Exact final-review pattern reused by Contractor Dispute and other step
 * workflows: readiness rows + explicit human confirmations + gated approval.
 */
export function ApprovalChecklist({
  title = "Final review",
  description = "Confirm the final content, supporting documents, and fulfillment details before approval.",
  reviewItems,
  confirmations,
  approveLabel = "Approve",
  onApprove,
}: ApprovalChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const ready = useMemo(
    () => confirmations.length > 0 && confirmations.every((item) => checked[item.id]),
    [confirmations, checked],
  );

  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={<StatusPill tone="warning" label="Approval required" />}
      footer={
        <button type="button" className="wf-btn wf-btn--primary" disabled={!ready} onClick={() => void onApprove?.()}>
          {approveLabel}
        </button>
      }
    >
      <div className="wf-review-list">
        {reviewItems.map((item, index) => (
          <div key={item.id} className="wf-review-row">
            <span className="wf-recommended-steps-number">{index + 1}</span>
            <div className="wf-review-copy">
              <div className="wf-review-label">{item.label}</div>
              {item.detail && <div className="wf-review-detail">{item.detail}</div>}
            </div>
            <StatusPill tone={item.tone ?? "success"} label={item.status} />
          </div>
        ))}
      </div>
      <div className="wf-confirmation-list">
        {confirmations.map((item) => (
          <CheckboxField
            key={item.id}
            label={item.label}
            checked={Boolean(checked[item.id])}
            onChange={(value) => setChecked((current) => ({ ...current, [item.id]: value }))}
          />
        ))}
      </div>
    </SectionCard>
  );
}
