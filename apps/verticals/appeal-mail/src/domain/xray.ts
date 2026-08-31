import type { Decision } from "./decision";
import type { AppealGround, GroundType } from "./ground";
import type { Evidence } from "./evidence";

/* ═══════════════════════════════════════════════════════════
   APPEAL X-RAY™ DOMAIN MODEL
   Cross-document analysis that finds issues, gaps, and
   contradictions in a user's decision + evidence pile.
   ═══════════════════════════════════════════════════════════ */

/* ── Source Reference ── A pointer to a specific spot in a document */
export interface SourceRef {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt?: string;
  /** Character offset in the extracted text */
  offset?: number;
}

/* ── Finding Types ── */
export type FindingType =
  | "date_conflict"        // Decision says date X, evidence says date Y
  | "unaddressed_evidence"  // User's evidence addresses the reason, but decision ignores it
  | "unsupported_conclusion" // Decision claims X, but no supporting doc found
  | "contradiction"        // Two documents say different things
  | "procedural_issue"     // Timeline violation, missing step, etc.
  | "factual_discrepancy"  // Names, numbers, addresses don't match
  | "missing_reference"    // Decision cites a document the user didn't upload
  | "strength"             // Something in the user's favor worth highlighting
  ;

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  date_conflict: "Conflicting Dates",
  unaddressed_evidence: "Evidence Not Addressed",
  unsupported_conclusion: "Unsupported Conclusion",
  contradiction: "Document Contradiction",
  procedural_issue: "Procedural Issue",
  factual_discrepancy: "Factual Discrepancy",
  missing_reference: "Missing Document",
  strength: "Potential Strength",
};

export const FINDING_TYPE_ICONS: Record<FindingType, string> = {
  date_conflict: "Calendar",
  unaddressed_evidence: "FileSearch",
  unsupported_conclusion: "AlertTriangle",
  contradiction: "GitCompare",
  procedural_issue: "Clock",
  factual_discrepancy: "Diff",
  missing_reference: "FileX",
  strength: "ThumbsUp",
};

export type Confidence = "high" | "medium" | "low";
export type FindingStatus = "confirmed" | "needs_review" | "dismissed" | "used_in_appeal";

/* ── X-Ray Finding ── */
export interface XRayFinding {
  id: string;
  type: FindingType;
  title: string;
  description: string;
  /** Why this matters for the appeal */
  whyItMatters: string;
  /** The sources that support this finding */
  sources: SourceRef[];
  /** The specific claims/excerpts that conflict or are relevant */
  claims: { source: SourceRef; text: string }[];
  confidence: Confidence;
  status: FindingStatus;
  /** Suggested appeal ground type, if applicable */
  suggestedGroundType?: GroundType;
  /** Suggested ground claim text */
  suggestedClaim?: string;
  createdAt: string;
}

/* ── Evidence Gap ── */
export interface EvidenceGap {
  id: string;
  title: string;
  description: string;
  /** Which finding this gap would strengthen */
  relatedFindingId?: string;
  /** Types of evidence that could fill this gap */
  suggestedEvidence: string[];
  severity: "critical" | "important" | "helpful";
  status: "open" | "addressed" | "dismissed";
  createdAt: string;
}

/* ── Appeal Map Node ── */
export interface AppealMapNode {
  id: string;
  type: "decision" | "reason" | "weakness" | "fact" | "evidence" | "ground" | "outcome";
  label: string;
  description?: string;
  /** Links to child nodes */
  children: string[];
  /** Source references for this node */
  sources?: SourceRef[];
  /** Related finding, if any */
  findingId?: string;
}

/* ── Appeal Map ── The visual flow structure */
export interface AppealMap {
  nodes: AppealMapNode[];
  /** Root node ID (the decision) */
  rootId: string;
}

/* ── Document Analysis Summary ── */
export interface DocumentSummary {
  id: string;
  name: string;
  pageCount: number;
  wordCount: number;
  /** Key dates found in this document */
  datesFound: string[];
  /** Key entities (names, orgs, reference numbers) */
  entities: string[];
  /** Role of this document in the analysis */
  role: "decision" | "evidence" | "supporting" | "correspondence" | "unknown";
}

/* ── X-Ray Result ── The complete analysis output */
export interface XRayResult {
  id: string;
  /** Summary stats */
  totalDocuments: number;
  totalPages: number;
  totalFindings: number;
  strongFindings: number;   // high confidence
  needsEvidence: number;     // findings that need more evidence
  contradictions: number;    // findings that are contradictions
  totalGaps: number;
  /** The findings */
  findings: XRayFinding[];
  /** Evidence gaps */
  gaps: EvidenceGap[];
  /** The appeal map */
  map: AppealMap;
  /** Per-document summaries */
  documents: DocumentSummary[];
  /** When the analysis was run */
  analyzedAt: string;
  /** Overall confidence in the analysis */
  overallConfidence: Confidence;
}

/* ═══════════════════════════════════════════════════════════
   DETECTION FUNCTIONS
   ═══════════════════════════════════════════════════════════ */

/* ── Input: extracted text from all documents ── */
export interface AnalyzedDocument {
  id: string;
  name: string;
  text: string;
  pageCount: number;
  /** Is this the decision letter? */
  isDecision: boolean;
}

/* ── Date extraction (reused from document-extraction) ── */
const DATE_REGEX = [
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

interface ExtractedDate {
  date: string;       // ISO format
  raw: string;        // original text
  offset: number;     // character offset in the text
  context: string;    // ~100 chars around the date
  documentId: string;
  documentName: string;
}

function extractDatesFromDoc(doc: AnalyzedDocument): ExtractedDate[] {
  const results: ExtractedDate[] = [];
  for (const regex of DATE_REGEX) {
    let match;
    while ((match = regex.exec(doc.text)) !== null) {
      const parsed = new Date(match[0]);
      if (!isNaN(parsed.getTime())) {
        const offset = match.index;
        const start = Math.max(0, offset - 80);
        const context = doc.text.slice(start, offset + 100).trim();
        results.push({
          date: parsed.toISOString().split("T")[0],
          raw: match[0],
          offset,
          context,
          documentId: doc.id,
          documentName: doc.name,
        });
      }
    }
  }
  return results;
}

/* ── Detect date conflicts between documents ── */
function detectDateConflicts(docs: AnalyzedDocument[]): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const allDates = docs.flatMap(extractDatesFromDoc);

  // Group by approximate context similarity — if two documents mention
  // dates near similar keywords (received, submitted, filed, mailed)
  // but the dates differ, that's a conflict
  const keywordPattern = /\b(received|submitted|filed|mailed|sent|postmarked|delivered|signed|dated|issue|decision|application|claim)\b/i;

  for (let i = 0; i < allDates.length; i++) {
    for (let j = i + 1; j < allDates.length; j++) {
      const d1 = allDates[i];
      const d2 = allDates[j];
      if (d1.documentId === d2.documentId) continue; // same doc, skip
      if (d1.date === d2.date) continue; // same date, no conflict

      // Check if both dates are near the same keyword
      const k1 = d1.context.match(keywordPattern);
      const k2 = d2.context.match(keywordPattern);
      if (!k1 || !k2) continue;
      if (k1[0].toLowerCase() !== k2[0].toLowerCase()) continue;

      // Same keyword, different dates, different documents — potential conflict
      findings.push({
        id: crypto.randomUUID(),
        type: "date_conflict",
        title: `Conflicting ${k1[0].toLowerCase()} dates`,
        description: `The decision states "${k1[0].toLowerCase()}" on ${d1.raw}, but ${d2.documentName} shows ${k2[0].toLowerCase()} on ${d2.raw}.`,
        whyItMatters: `The date discrepancy may affect how the decision's timeline is understood. If the ${k1[0].toLowerCase()} date is wrong, it could undermine the agency's reasoning.`,
        sources: [
          { documentId: d1.documentId, documentName: d1.documentName, excerpt: d1.context },
          { documentId: d2.documentId, documentName: d2.documentName, excerpt: d2.context },
        ],
        claims: [
          { source: { documentId: d1.documentId, documentName: d1.documentName }, text: d1.raw },
          { source: { documentId: d2.documentId, documentName: d2.documentName }, text: d2.raw },
        ],
        confidence: "high",
        status: "needs_review",
        suggestedGroundType: "factual_error",
        suggestedClaim: `The decision incorrectly states the ${k1[0].toLowerCase()} date as ${d1.raw}, when the actual date was ${d2.raw} as shown in ${d2.documentName}.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/* ── Detect unaddressed evidence ── */
function detectUnaddressedEvidence(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((d) => d.isDecision);
  if (!decisionDoc || !decision.reasons.length) return findings;

  // For each reason in the decision, check if any non-decision document
  // seems to address that reason but the decision doesn't mention it
  const evidenceDocs = docs.filter((d) => !d.isDecision);

  for (const reason of decision.reasons) {
    const reasonWords = reason.text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    if (reasonWords.length < 3) continue;

    for (const evDoc of evidenceDocs) {
      // Check if this evidence document discusses the same topic
      // (shares significant words with the reason)
      const evText = evDoc.text.toLowerCase();
      const overlap = reasonWords.filter((w) => evText.includes(w));
      const overlapRatio = overlap.length / reasonWords.length;

      if (overlapRatio > 0.4) {
        // Check if the decision mentions this evidence document
        const evNameBase = evDoc.name.replace(/\.[^.]+$/, "").toLowerCase();
        const decisionMentions = decisionDoc.text.toLowerCase().includes(evNameBase);

        if (!decisionMentions) {
          findings.push({
            id: crypto.randomUUID(),
            type: "unaddressed_evidence",
            title: `Evidence may address: "${reason.text.slice(0, 60)}..."`,
            description: `Your document "${evDoc.name}" appears to address the agency's stated reason, but the decision does not appear to discuss it.`,
            whyItMatters: `If this evidence was not considered, it may form the basis for arguing the decision was incomplete or failed to consider all relevant evidence.`,
            sources: [
              { documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: reason.text },
              { documentId: evDoc.id, documentName: evDoc.name, excerpt: evDoc.text.slice(0, 300) },
            ],
            claims: [
              { source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: reason.text },
            ],
            confidence: "medium",
            status: "needs_review",
            suggestedGroundType: "insufficient_evidence",
            suggestedClaim: `The decision failed to consider ${evDoc.name}, which directly addresses the stated reason for denial: "${reason.text.slice(0, 100)}".`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return findings;
}

/* ── Detect unsupported conclusions ── */
function detectUnsupportedConclusions(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((d) => d.isDecision);
  if (!decisionDoc) return findings;

  const evidenceDocs = docs.filter((d) => !d.isDecision);
  const allEvidenceText = evidenceDocs.map((d) => d.text.toLowerCase()).join(" ");

  // Look for conclusion-like statements in the decision
  const conclusionPatterns = [
    /(?:therefore|conclude|concluded|determine|determined|find|found|established|demonstrated|shown that)\s+([^.]{20,200}\.?)/gi,
    /(?:based on|in light of|given that|considering)\s+([^.]{20,200}\.?)/gi,
  ];

  for (const pattern of conclusionPatterns) {
    let match;
    while ((match = pattern.exec(decisionDoc.text)) !== null && findings.length < 5) {
      const conclusion = match[1].trim();
      if (conclusion.length < 20) continue;

      // Extract key factual words from the conclusion
      const keyWords = conclusion.toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 5 && !["therefore", "conclude", "determined", "concluded", "found", "based"].includes(w));

      if (keyWords.length < 2) continue;

      // Check if any evidence document supports this conclusion
      const supported = keyWords.some((w) => allEvidenceText.includes(w));
      if (!supported) {
        findings.push({
          id: crypto.randomUUID(),
          type: "unsupported_conclusion",
          title: `Conclusion may lack supporting documentation`,
          description: `The decision states: "${conclusion.slice(0, 150)}". We could not identify supporting documentation for this conclusion in the materials provided.`,
          whyItMatters: `This does not mean the conclusion is incorrect — it means the supporting basis wasn't identified in the supplied documents. The agency may need to provide its basis.`,
          sources: [
            { documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: conclusion },
          ],
          claims: [
            { source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: conclusion },
          ],
          confidence: "low",
          status: "needs_review",
          suggestedGroundType: "legal_error",
          suggestedClaim: `The decision concludes that "${conclusion.slice(0, 100)}" but does not identify the supporting basis for this conclusion in the record.`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return findings;
}

/* ── Detect contradictions between documents ── */
function detectContradictions(docs: AnalyzedDocument[]): XRayFinding[] {
  const findings: XRayFinding[] = [];

  // Look for negation patterns: one doc says X, another says "not X"
  const negationPattern = /\b(not|no|never|denied|rejected|failed|did not|does not|did not)\s+([a-z\s]{5,60})/gi;

  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const doc1 = docs[i];
      const doc2 = docs[j];

      const negations1 = [...doc1.text.matchAll(negationPattern)];
      const negations2 = [...doc2.text.matchAll(negationPattern)];

      for (const n1 of negations1) {
        const negatedPhrase = n1[2].trim().toLowerCase();
        if (negatedPhrase.length < 8) continue;

        // Check if doc2 affirms what doc1 denies (or vice versa)
        const affirmPattern = new RegExp(`\\b(did|does|was|were|is|are|has|have|had)\\s+${negatedPhrase.replace(/\s+/g, "\\s+")}`, "i");
        if (affirmPattern.test(doc2.text)) {
          findings.push({
            id: crypto.randomUUID(),
            type: "contradiction",
            title: `Potential contradiction between documents`,
            description: `"${doc1.name}" states "${n1[0].trim()}", but "${doc2.name}" appears to state the opposite.`,
            whyItMatters: `Contradictions between documents can undermine the credibility of the decision or support a claim that the record is incomplete.`,
            sources: [
              { documentId: doc1.id, documentName: doc1.name, excerpt: n1[0] },
              { documentId: doc2.id, documentName: doc2.name, excerpt: negatedPhrase },
            ],
            claims: [
              { source: { documentId: doc1.id, documentName: doc1.name }, text: n1[0].trim() },
              { source: { documentId: doc2.id, documentName: doc2.name }, text: `Affirms: ${negatedPhrase}` },
            ],
            confidence: "medium",
            status: "needs_review",
            suggestedGroundType: "factual_error",
            suggestedClaim: `There is a contradiction between the documents: "${doc1.name}" denies "${negatedPhrase}" while "${doc2.name}" affirms it.`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return findings.slice(0, 5);
}

/* ── Detect procedural issues ── */
function detectProceduralIssues(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((d) => d.isDecision);
  if (!decisionDoc) return findings;

  // Check for deadline-related issues
  if (decision.deadline?.daysWindow) {
    const decisionDate = decision.decisionDate ? new Date(decision.decisionDate) : null;
    if (decisionDate) {
      const deadlineDate = new Date(decisionDate);
      deadlineDate.setDate(deadlineDate.getDate() + decision.deadline.daysWindow);
      const now = new Date();
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        findings.push({
          id: crypto.randomUUID(),
          type: "procedural_issue",
          title: `Appeal deadline may have passed`,
          description: `The decision was issued on ${decision.decisionDate} with a ${decision.deadline.daysWindow}-day appeal window. The deadline appears to have been ${Math.abs(daysLeft)} days ago.`,
          whyItMatters: `Missing an appeal deadline can be fatal to an appeal. However, some jurisdictions allow late appeals for good cause. Check whether any exceptions apply.`,
          sources: [
            { documentId: decisionDoc.id, documentName: decisionDoc.name },
          ],
          claims: [],
          confidence: "high",
          status: "needs_review",
          createdAt: new Date().toISOString(),
        });
      } else if (daysLeft <= 7) {
        findings.push({
          id: crypto.randomUUID(),
          type: "procedural_issue",
          title: `Appeal deadline approaching — ${daysLeft} days remaining`,
          description: `The decision was issued on ${decision.decisionDate} with a ${decision.deadline.daysWindow}-day appeal window. You have approximately ${daysLeft} days remaining.`,
          whyItMatters: `Time-sensitive: The appeal must be filed within the deadline. Prioritize completing and mailing your appeal immediately.`,
          sources: [
            { documentId: decisionDoc.id, documentName: decisionDoc.name },
          ],
          claims: [],
          confidence: "high",
          status: "needs_review",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return findings;
}

/* ── Detect strengths (things in the user's favor) ── */
function detectStrengths(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((d) => d.isDecision);
  if (!decisionDoc) return findings;

  // Look for hedging language in the decision (may indicate weak reasoning)
  const hedgePattern = /\b(may|might|appears|seemingly|arguably|presumably|likely|probably|apparently|ostensibly)\s+([a-z\s]{10,80})/gi;
  const hedges = [...decisionDoc.text.matchAll(hedgePattern)];

  for (const hedge of hedges.slice(0, 3)) {
    findings.push({
      id: crypto.randomUUID(),
      type: "strength",
      title: `Hedged reasoning in decision`,
      description: `The decision uses qualified language: "${hedge[0].trim()}". This may indicate the agency was not fully certain of its conclusion.`,
      whyItMatters: `Hedged language can be highlighted to show the decision's reasoning was tentative, potentially weakening its authority.`,
      sources: [
        { documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: hedge[0] },
      ],
      claims: [
        { source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: hedge[0].trim() },
      ],
      confidence: "low",
      status: "needs_review",
      createdAt: new Date().toISOString(),
    });
  }

  return findings;
}

/* ── Detect evidence gaps ── */
function detectEvidenceGaps(findings: XRayFinding[], decision: Decision): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];

  for (const finding of findings) {
    if (finding.status === "dismissed") continue;

    switch (finding.type) {
      case "date_conflict":
        gaps.push({
          id: crypto.randomUUID(),
          title: `Proof of actual date`,
          description: `The appeal disputes the "${finding.title.toLowerCase()}" but may need stronger proof of the correct date.`,
          relatedFindingId: finding.id,
          suggestedEvidence: ["submission confirmation", "email receipt", "portal screenshot", "certified-mail record", "dated photograph"],
          severity: "important",
          status: "open",
          createdAt: new Date().toISOString(),
        });
        break;

      case "unaddressed_evidence":
        gaps.push({
          id: crypto.randomUUID(),
          title: `Proof that evidence was submitted`,
          description: `The appeal argues the decision didn't consider your evidence, but you may need proof that the evidence was actually submitted before the decision was made.`,
          relatedFindingId: finding.id,
          suggestedEvidence: ["submission confirmation", "email receipt", "portal screenshot", "tracking number", "certified-mail receipt"],
          severity: "critical",
          status: "open",
          createdAt: new Date().toISOString(),
        });
        break;

      case "unsupported_conclusion":
        gaps.push({
          id: crypto.randomUUID(),
          title: `Counter-evidence to the conclusion`,
          description: `The decision makes a conclusion that appears unsupported. Additional evidence contradicting this conclusion would strengthen the appeal.`,
          relatedFindingId: finding.id,
          suggestedEvidence: ["inspection report", "expert opinion", "photographs", "dated correspondence", "official records"],
          severity: "important",
          status: "open",
          createdAt: new Date().toISOString(),
        });
        break;

      case "contradiction":
        gaps.push({
          id: crypto.randomUUID(),
          title: `Corroborating evidence for your version`,
          description: `A contradiction was found, but having additional evidence confirming your version of events would make the contradiction more compelling.`,
          relatedFindingId: finding.id,
          suggestedEvidence: ["third-party statement", "timestamped record", "official document", "photograph with metadata"],
          severity: "helpful",
          status: "open",
          createdAt: new Date().toISOString(),
        });
        break;
    }
  }

  // If no findings yet, suggest general gaps
  if (gaps.length === 0 && decision.reasons.length > 0) {
    for (const reason of decision.reasons.slice(0, 2)) {
      gaps.push({
        id: crypto.randomUUID(),
        title: `Evidence addressing: "${reason.text.slice(0, 50)}..."`,
        description: `The decision gives a reason for denial. Uploading evidence that directly addresses this reason would strengthen your appeal.`,
        suggestedEvidence: ["relevant correspondence", "official records", "photographs", "expert opinion", "dated documentation"],
        severity: "important",
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return gaps;
}

/* ── Build the Appeal Map from findings ── */
function buildAppealMap(decision: Decision, findings: XRayFinding[], evidence: Evidence[]): AppealMap {
  const nodes: AppealMapNode[] = [];
  const rootId = crypto.randomUUID();

  // Root: the decision
  nodes.push({
    id: rootId,
    type: "decision",
    label: decision.agency || "The Decision",
    description: decision.decisionTypeLabel || "Decision",
    children: [],
  });

  // For each reason in the decision
  for (const reason of decision.reasons.slice(0, 5)) {
    const reasonId = crypto.randomUUID();
    nodes.find((n) => n.id === rootId)!.children.push(reasonId);

    nodes.push({
      id: reasonId,
      type: "reason",
      label: reason.text.slice(0, 80),
      description: "Reason given in the decision",
      children: [],
    });

    // Find findings related to this reason
    const relatedFindings = findings.filter((f) =>
      f.sources.some((s) => s.excerpt?.includes(reason.text.slice(0, 30)))
    );

    for (const finding of relatedFindings) {
      const weaknessId = crypto.randomUUID();
      nodes.find((n) => n.id === reasonId)!.children.push(weaknessId);

      nodes.push({
        id: weaknessId,
        type: "weakness",
        label: FINDING_TYPE_LABELS[finding.type],
        description: finding.title,
        children: [],
        findingId: finding.id,
      });

      // Link evidence to this weakness
      for (const ev of evidence) {
        if (ev.groundIds.length === 0) {
          const evidenceId = crypto.randomUUID();
          nodes.find((n) => n.id === weaknessId)!.children.push(evidenceId);
          nodes.push({
            id: evidenceId,
            type: "evidence",
            label: ev.label,
            description: ev.excerpt,
            children: [],
            sources: [{ documentId: ev.id, documentName: ev.label }],
          });
        }
      }

      // Suggested ground
      if (finding.suggestedGroundType) {
        const groundId = crypto.randomUUID();
        nodes.find((n) => n.id === weaknessId)!.children.push(groundId);
        nodes.push({
          id: groundId,
          type: "ground",
          label: `Potential ${finding.suggestedGroundType.replace(/_/g, " ")}`,
          description: finding.suggestedClaim,
          children: [],
          findingId: finding.id,
        });
      }
    }
  }

  // If no reasons found, add a generic structure
  if (decision.reasons.length === 0) {
    const findingId = crypto.randomUUID();
    nodes.find((n) => n.id === rootId)!.children.push(findingId);
    nodes.push({
      id: findingId,
      type: "weakness",
      label: "Analysis pending",
      description: "Upload the decision letter for detailed analysis",
      children: [],
    });
  }

  // Add outcome node
  const outcomeId = crypto.randomUUID();
  for (const node of nodes) {
    if (node.type === "ground" && node.children.length === 0) {
      node.children.push(outcomeId);
    }
  }
  nodes.push({
    id: outcomeId,
    type: "outcome",
    label: "Appeal filed",
    description: "Request for reversal or reconsideration",
    children: [],
  });

  return { nodes, rootId };
}

/* ── Summarize documents ── */
function summarizeDocuments(docs: AnalyzedDocument[]): DocumentSummary[] {
  return docs.map((doc) => {
    const words = doc.text.split(/\s+/).filter(Boolean);
    const dates = extractDatesFromDoc(doc).map((d) => d.date);

    // Extract entities (simple heuristic: capitalized phrases)
    const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    const entities = new Set<string>();
    let match;
    while ((match = entityPattern.exec(doc.text)) !== null && entities.size < 10) {
      if (match[1].length > 3 && !["The", "This", "That", "Your", "Dear", "From"].includes(match[1])) {
        entities.add(match[1]);
      }
    }

    return {
      id: doc.id,
      name: doc.name,
      pageCount: doc.pageCount,
      wordCount: words.length,
      datesFound: [...new Set(dates)],
      entities: [...entities],
      role: doc.isDecision ? "decision" as const : "evidence" as const,
    };
  });
}

/* ═══════════════════════════════════════════════════════════
   MAIN ANALYSIS FUNCTION
   ═══════════════════════════════════════════════════════════ */

export function runXRayAnalysis(
  docs: AnalyzedDocument[],
  decision: Decision,
  evidence: Evidence[] = [],
): XRayResult {
  const findings: XRayFinding[] = [];

  // Run all detectors
  findings.push(...detectDateConflicts(docs));
  findings.push(...detectUnaddressedEvidence(docs, decision));
  findings.push(...detectUnsupportedConclusions(docs, decision));
  findings.push(...detectContradictions(docs));
  findings.push(...detectProceduralIssues(docs, decision));
  findings.push(...detectStrengths(docs, decision));

  // Detect evidence gaps
  const gaps = detectEvidenceGaps(findings, decision);

  // Build the appeal map
  const map = buildAppealMap(decision, findings, evidence);

  // Summarize documents
  const documents = summarizeDocuments(docs);

  // Compute summary stats
  const strongFindings = findings.filter((f) => f.confidence === "high").length;
  const needsEvidence = gaps.filter((g) => g.severity === "important" || g.severity === "critical").length;
  const contradictions = findings.filter((f) => f.type === "contradiction" || f.type === "date_conflict").length;
  const totalPages = docs.reduce((sum, d) => sum + d.pageCount, 0);

  // Overall confidence
  const overallConfidence: Confidence =
    strongFindings >= 3 ? "high" :
    findings.length >= 2 ? "medium" :
    "low";

  return {
    id: crypto.randomUUID(),
    totalDocuments: docs.length,
    totalPages,
    totalFindings: findings.length,
    strongFindings,
    needsEvidence,
    contradictions,
    totalGaps: gaps.length,
    findings,
    gaps,
    map,
    documents,
    analyzedAt: new Date().toISOString(),
    overallConfidence,
  };
}

/* ═══════════════════════════════════════════════════════════
   BUILD APPEAL FROM X-RAY FINDINGS
   Converts approved findings into appeal grounds
   ═══════════════════════════════════════════════════════════ */

export interface BuiltGround {
  findingId: string;
  groundType: GroundType;
  claim: string;
  source: string;
  evidenceIds: string[];
}

export function buildAppealFromXRay(findings: XRayFinding[]): BuiltGround[] {
  return findings
    .filter((f) => f.status === "used_in_appeal" && f.suggestedGroundType && f.suggestedClaim)
    .map((f) => ({
      findingId: f.id,
      groundType: f.suggestedGroundType!,
      claim: f.suggestedClaim!,
      source: f.claims.map((c) => c.text).join(" "),
      evidenceIds: f.sources
        .filter((s) => s.documentId !== f.sources[0]?.documentId) // evidence, not decision
        .map((s) => s.documentId),
    }));
}

/* ── Update finding status ── */
export function updateFindingStatus(
  result: XRayResult,
  findingId: string,
  status: FindingStatus,
): XRayResult {
  return {
    ...result,
    findings: result.findings.map((f) =>
      f.id === findingId ? { ...f, status } : f
    ),
  };
}

/* ── Update gap status ── */
export function updateGapStatus(
  result: XRayResult,
  gapId: string,
  status: "open" | "addressed" | "dismissed",
): XRayResult {
  return {
    ...result,
    gaps: result.gaps.map((g) =>
      g.id === gapId ? { ...g, status } : g
    ),
  };
}
