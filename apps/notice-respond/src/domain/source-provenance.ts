/* ═══════════════════════════════════════════════════════════
   SOURCE PROVENANCE — structured provenance for externally
   sourced claims.

   Separates:
   - SOURCE FACT: what the source says
   - INTERPRETATION: what the system infers
   - USER-SPECIFIC ANALYSIS: what applies to this case

   Every externally sourced claim has structured provenance.

   ═══════════════════════════════════════════════════════════ */

// ── Source Types ──────────────────────────────────────────────

export type SourceType =
  | "government_publication"
  | "government_website"
  | "government_form_instructions"
  | "government_faq"
  | "statute"
  | "regulation"
  | "court_ruling"
  | "professional_guidance"
  | "news"
  | "other";

export type VerificationStatus =
  | "verified"     // URL was checked and content confirmed
  | "unverified"   // URL exists but content not checked
  | "paraphrased"  // Content is paraphrased from source
  | "unknown";     // Verification status not established

// ── Source ────────────────────────────────────────────────────

export interface AuthoritativeSource {
  id: string;
  type: SourceType;
  title: string;
  url: string;
  /** Organization that published the source */
  organization: string;
  description: string;
  /** What topics this source is authoritative for */
  covers: string[];
  /** When the source was last verified */
  verifiedAt?: string;
  verificationStatus: VerificationStatus;
}

// ── Source Citation ──────────────────────────────────────────

export interface SourceCitation {
  sourceId: string;
  /** What the source says (verbatim or clearly paraphrased) */
  fact: string;
  /** What the system interprets from this fact */
  interpretation: string;
  /** What this means for the user's specific case */
  userSpecificAnalysis?: string;
  /** Whether the fact is the source's own statement or system inference */
  isSourceStatement: boolean;
  /** Section/topic within the source */
  section?: string;
}

// ── Research Pack Interface ──────────────────────────────────

export interface ResearchPack {
  sources: AuthoritativeSource[];
  knownFacts: SourceCitation[];
}

// ── Helpers ──────────────────────────────────────────────────

export function createSource(params: {
  type: SourceType;
  title: string;
  url: string;
  organization: string;
  description: string;
  covers: string[];
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
}): AuthoritativeSource {
  return {
    id: crypto.randomUUID(),
    type: params.type,
    title: params.title,
    url: params.url,
    organization: params.organization,
    description: params.description,
    covers: params.covers,
    verificationStatus: params.verificationStatus ?? "unverified",
    verifiedAt: params.verifiedAt,
  };
}

export function createCitation(params: {
  sourceId: string;
  fact: string;
  interpretation: string;
  userSpecificAnalysis?: string;
  isSourceStatement: boolean;
  section?: string;
}): SourceCitation {
  return {
    sourceId: params.sourceId,
    fact: params.fact,
    interpretation: params.interpretation,
    userSpecificAnalysis: params.userSpecificAnalysis,
    isSourceStatement: params.isSourceStatement,
    section: params.section,
  };
}

export function citeSource(sources: AuthoritativeSource[], sourceId: string): AuthoritativeSource | undefined {
  return sources.find((s) => s.id === sourceId);
}

export function getFactsForTopic(pack: ResearchPack, topic: string): SourceCitation[] {
  return pack.knownFacts.filter((f) => {
    const source = citeSource(pack.sources, f.sourceId);
    return source?.covers.includes(topic);
  });
}
