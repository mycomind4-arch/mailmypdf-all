import { SectionCard } from "./SectionCard";

export interface DocumentSummaryCardProps {
  title: string;
  pages?: number;
  sizeLabel?: string;
  recipient?: string;
  mailMethod?: string;
  sha256?: string;
  statusLabel?: string;
}

/** Compact document/packet summary promoted from the app-local design helpers. */
export function DocumentSummaryCard({
  title,
  pages,
  sizeLabel,
  recipient,
  mailMethod,
  sha256,
  statusLabel,
}: DocumentSummaryCardProps) {
  return (
    <SectionCard
      title={title}
      headerAside={statusLabel ? <span className="wf-pill wf-pill--info">{statusLabel}</span> : undefined}
    >
      <dl className="wf-document-summary">
        {pages !== undefined && <div><dt>Pages</dt><dd>{pages}</dd></div>}
        {sizeLabel && <div><dt>Size</dt><dd>{sizeLabel}</dd></div>}
        {recipient && <div><dt>Recipient</dt><dd>{recipient}</dd></div>}
        {mailMethod && <div><dt>Mailing</dt><dd>{mailMethod}</dd></div>}
        {sha256 && <div><dt>SHA-256</dt><dd className="wf-document-hash">{sha256}</dd></div>}
      </dl>
    </SectionCard>
  );
}
