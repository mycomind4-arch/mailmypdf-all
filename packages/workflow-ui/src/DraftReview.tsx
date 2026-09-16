import { SectionCard } from "./SectionCard";
import { StatusPill } from "./StatusPill";

export interface DraftReviewProps {
  draft: string;
  ready?: boolean;
  warnings?: string[];
  title?: string;
  description?: string;
  onEdit?: () => void;
  onApprove?: () => void | Promise<void>;
  editLabel?: string;
  approveLabel?: string;
}

/**
 * Shared review surface for generated correspondence. It does not generate,
 * save, approve, or mail anything itself; those actions remain runtime-owned.
 */
export function DraftReview({
  draft,
  ready = false,
  warnings = [],
  title = "Draft correspondence",
  description = "Review the generated text against the matter record before approval.",
  onEdit,
  onApprove,
  editLabel = "Edit draft",
  approveLabel = "Approve draft",
}: DraftReviewProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      headerAside={<StatusPill tone={ready ? "success" : "warning"} label={ready ? "Ready for review" : "Needs review"} />}
      footer={
        <div className="wf-draft-actions">
          {onEdit && <button type="button" className="wf-btn wf-btn--outline" onClick={onEdit}>{editLabel}</button>}
          {onApprove && <button type="button" className="wf-btn wf-btn--primary" disabled={!ready} onClick={() => void onApprove()}>{approveLabel}</button>}
        </div>
      }
    >
      <pre className="wf-draft-preview">{draft}</pre>
      {warnings.length > 0 && (
        <div className="wf-callout wf-callout--warning">
          <strong>Review before approval</strong>
          <ul className="wf-callout-list">
            {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
