export type PublicationStage =
  | "discover"
  | "normalize"
  | "deduplicate"
  | "score"
  | "enrich"
  | "evidence"
  | "plan"
  | "draft"
  | "verify"
  | "render"
  | "approval"
  | "publish"
  | "analytics";

export interface SourceRef {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  publishedAt?: string;
  retrievedAt: string;
  sourceType: "rss" | "web" | "api" | "social" | "document" | "internal";
  primary?: boolean;
}

export interface StoryCandidate {
  id: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
  source: SourceRef;
  tags: string[];
  score?: number;
  embedding?: readonly number[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceClaim {
  id: string;
  text: string;
  sourceIds: readonly string[];
  confidence: number;
  disputed?: boolean;
  contradictionSourceIds?: readonly string[];
}

export interface EvidencePacket {
  storyId: string;
  sources: readonly SourceRef[];
  claims: readonly EvidenceClaim[];
  notes?: readonly string[];
}

export interface PlannedStory {
  story: StoryCandidate;
  evidence: EvidencePacket;
  position: number;
  section: string;
  angle?: string;
}

export interface EditionDraft {
  publicationId: string;
  editionId: string;
  subject: string;
  preheader?: string;
  markdown: string;
  plannedStories: readonly PlannedStory[];
  createdAt: string;
}

export interface VerificationIssue {
  severity: "warning" | "error";
  message: string;
  claimId?: string;
  storyId?: string;
}

export interface VerifiedEdition extends EditionDraft {
  verification: {
    passed: boolean;
    issues: readonly VerificationIssue[];
    verifiedAt: string;
  };
}

export interface RenderedEdition {
  edition: VerifiedEdition;
  html: string;
  text: string;
}

export interface PublicationRun {
  id: string;
  publicationId: string;
  stage: PublicationStage;
  status: "running" | "awaiting_approval" | "published" | "rejected" | "failed";
  startedAt: string;
  completedAt?: string;
  error?: string;
  warnings?: string[];
}
