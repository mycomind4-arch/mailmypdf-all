export type SignatureRequirement =
  | "none"
  | "claimant"
  | "representative"
  | "provider"
  | "witness"
  | "other";

export type OfficialFormSource = {
  /** Human-readable issuing authority, for example "Social Security Administration". */
  authority: string;
  /** Canonical public source URL when known. */
  url?: string;
  /** Published revision/edition identifier when the authority exposes one. */
  revision?: string;
  /** Effective date for this edition when known. */
  effectiveDate?: string;
  /** SHA-256 of the retained official source bytes when known. */
  sha256?: string;
};

export type OfficialFormDefinition<Kind extends string = string> = {
  /** Stable workflow-facing identifier, normally used as the document evidence kind. */
  kind: Kind;
  agency: string;
  formNumber: string;
  title: string;
  sourceFilename: string;
  /** Immutable normalized copy used for deterministic packet assembly when needed. */
  mailReadyFilename?: string;
  /** Runtime/user-facing download URL. Kept separate from provenance metadata. */
  downloadHref?: string;
  source?: OfficialFormSource;
  signatures?: readonly SignatureRequirement[];
  notes?: readonly string[];
};

export type OfficialFormDocument = {
  evidence_kind: string | null;
  included: boolean;
  usable: boolean;
  security_status: string;
};

export function assertOfficialFormDefinition(form: OfficialFormDefinition): void {
  const required = [form.kind, form.agency, form.formNumber, form.title, form.sourceFilename];
  if (required.some((value) => !value.trim())) {
    throw new Error("Official form definitions require kind, agency, form number, title, and source filename.");
  }
  if (form.source?.sha256 && !/^[a-f0-9]{64}$/i.test(form.source.sha256)) {
    throw new Error(`Official form ${form.kind} has an invalid SHA-256 value.`);
  }
}
