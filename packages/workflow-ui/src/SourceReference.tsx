export interface SourceReferenceProps {
  documentName: string;
  page?: number;
  excerpt?: string;
  confidence?: "high" | "medium" | "low";
  onOpen?: () => void;
}

/**
 * Compact provenance reference promoted from Appeal's workspace helpers.
 * The caller owns document access/highlighting; this component only renders
 * the source identity and optional excerpt.
 */
export function SourceReference({
  documentName,
  page,
  excerpt,
  confidence,
  onOpen,
}: SourceReferenceProps) {
  const content = (
    <>
      <span className="wf-source-document">{documentName}</span>
      {page !== undefined && <span className="wf-source-page"> · p. {page}</span>}
      {confidence && <span className={`wf-source-confidence wf-source-confidence--${confidence}`}>{confidence}</span>}
      {excerpt && <span className="wf-source-excerpt">“{excerpt}”</span>}
    </>
  );

  return onOpen ? (
    <button type="button" className="wf-source-reference wf-source-reference--button" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div className="wf-source-reference">{content}</div>
  );
}
