import type { Decision } from "./decision.js";
import { daysUntilDeadline } from "./decision.js";
import type { Evidence } from "./evidence.js";
import type { GroundType } from "./ground.js";

export interface SourceRef {
  documentId: string;
  documentName: string;
  page?: number;
  excerpt?: string;
  offset?: number;
}

export type FindingType =
  | "date_conflict"
  | "unaddressed_evidence"
  | "unsupported_conclusion"
  | "contradiction"
  | "procedural_issue"
  | "factual_discrepancy"
  | "missing_reference"
  | "strength";

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

export interface XRayFinding {
  id: string;
  type: FindingType;
  title: string;
  description: string;
  whyItMatters: string;
  sources: SourceRef[];
  claims: Array<{ source: SourceRef; text: string }>;
  confidence: Confidence;
  status: FindingStatus;
  suggestedGroundType?: GroundType;
  suggestedClaim?: string;
  createdAt: string;
}

export interface EvidenceGap {
  id: string;
  title: string;
  description: string;
  relatedFindingId?: string;
  suggestedEvidence: string[];
  severity: "critical" | "important" | "helpful";
  status: "open" | "addressed" | "dismissed";
  createdAt: string;
}

export interface AppealMapNode {
  id: string;
  type: "decision" | "reason" | "weakness" | "fact" | "evidence" | "ground" | "outcome";
  label: string;
  description?: string;
  children: string[];
  sources?: SourceRef[];
  findingId?: string;
}

export interface AppealMap {
  nodes: AppealMapNode[];
  rootId: string;
}

export interface DocumentSummary {
  id: string;
  name: string;
  pageCount: number;
  wordCount: number;
  datesFound: string[];
  entities: string[];
  role: "decision" | "evidence" | "supporting" | "correspondence" | "unknown";
}

export interface XRayResult {
  id: string;
  totalDocuments: number;
  totalPages: number;
  totalFindings: number;
  strongFindings: number;
  needsEvidence: number;
  contradictions: number;
  totalGaps: number;
  findings: XRayFinding[];
  gaps: EvidenceGap[];
  map: AppealMap;
  documents: DocumentSummary[];
  analyzedAt: string;
  overallConfidence: Confidence;
}

export interface AnalyzedDocument {
  id: string;
  name: string;
  text: string;
  pageCount: number;
  isDecision: boolean;
}

interface ExtractedDate {
  date: string;
  raw: string;
  offset: number;
  context: string;
  documentId: string;
  documentName: string;
}

const DATE_REGEX = [
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
];

function extractDatesFromDoc(doc: AnalyzedDocument): ExtractedDate[] {
  const results: ExtractedDate[] = [];
  for (const template of DATE_REGEX) {
    const regex = new RegExp(template.source, template.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(doc.text)) !== null) {
      const parsed = new Date(match[0]);
      if (Number.isNaN(parsed.getTime())) continue;
      const offset = match.index;
      results.push({
        date: parsed.toISOString().slice(0, 10),
        raw: match[0],
        offset,
        context: doc.text.slice(Math.max(0, offset - 80), offset + 100).trim(),
        documentId: doc.id,
        documentName: doc.name,
      });
    }
  }
  return results;
}

function detectDateConflicts(docs: AnalyzedDocument[]): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const dates = docs.flatMap(extractDatesFromDoc);
  const keywordPattern = /\b(received|submitted|filed|mailed|sent|postmarked|delivered|signed|dated|issue|decision|application|claim)\b/i;

  for (let i = 0; i < dates.length; i += 1) {
    for (let j = i + 1; j < dates.length; j += 1) {
      const left = dates[i];
      const right = dates[j];
      if (left.documentId === right.documentId || left.date === right.date) continue;
      const leftKeyword = left.context.match(keywordPattern)?.[0]?.toLowerCase();
      const rightKeyword = right.context.match(keywordPattern)?.[0]?.toLowerCase();
      if (!leftKeyword || leftKeyword !== rightKeyword) continue;
      findings.push({
        id: crypto.randomUUID(),
        type: "date_conflict",
        title: `Conflicting ${leftKeyword} dates`,
        description: `${left.documentName} associates ${leftKeyword} with ${left.raw}, while ${right.documentName} associates it with ${right.raw}.`,
        whyItMatters: "A material date discrepancy can affect chronology, timeliness, or the factual basis of the decision and should be verified before it is used.",
        sources: [
          { documentId: left.documentId, documentName: left.documentName, excerpt: left.context, offset: left.offset },
          { documentId: right.documentId, documentName: right.documentName, excerpt: right.context, offset: right.offset },
        ],
        claims: [
          { source: { documentId: left.documentId, documentName: left.documentName }, text: left.raw },
          { source: { documentId: right.documentId, documentName: right.documentName }, text: right.raw },
        ],
        confidence: "high",
        status: "needs_review",
        suggestedGroundType: "factual_error",
        suggestedClaim: `The record contains conflicting ${leftKeyword} dates that should be resolved before the decision is relied on.`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return findings.slice(0, 10);
}

function detectUnaddressedEvidence(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((doc) => doc.isDecision);
  if (!decisionDoc) return findings;

  for (const reason of decision.reasons) {
    const reasonWords = reason.text.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    if (reasonWords.length < 3) continue;
    for (const evidenceDoc of docs.filter((doc) => !doc.isDecision)) {
      const evidenceText = evidenceDoc.text.toLowerCase();
      const overlap = reasonWords.filter((word) => evidenceText.includes(word));
      if (overlap.length / reasonWords.length <= 0.4) continue;
      const baseName = evidenceDoc.name.replace(/\.[^.]+$/, "").toLowerCase();
      if (baseName && decisionDoc.text.toLowerCase().includes(baseName)) continue;
      findings.push({
        id: crypto.randomUUID(),
        type: "unaddressed_evidence",
        title: `Evidence may address: "${reason.text.slice(0, 60)}${reason.text.length > 60 ? "..." : ""}"`,
        description: `${evidenceDoc.name} appears to address a stated reason for the decision, but the supplied decision text does not appear to identify that document.`,
        whyItMatters: "If relevant evidence was properly submitted but not considered, that may support an incomplete-review argument. Submission history still needs to be verified.",
        sources: [
          { documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: reason.text },
          { documentId: evidenceDoc.id, documentName: evidenceDoc.name, excerpt: evidenceDoc.text.slice(0, 300) },
        ],
        claims: [{ source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: reason.text }],
        confidence: "medium",
        status: "needs_review",
        suggestedGroundType: "incomplete_review",
        suggestedClaim: `The decision does not appear to address ${evidenceDoc.name}, which may bear directly on the stated reason: "${reason.text.slice(0, 100)}".`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return findings.slice(0, 10);
}

function detectUnsupportedConclusions(docs: AnalyzedDocument[]): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const decisionDoc = docs.find((doc) => doc.isDecision);
  if (!decisionDoc) return findings;
  const evidenceText = docs.filter((doc) => !doc.isDecision).map((doc) => doc.text.toLowerCase()).join(" ");
  const patterns = [
    /(?:therefore|conclude|concluded|determine|determined|find|found|established|demonstrated|shown that)\s+([^.]{20,200}\.?)/gi,
    /(?:based on|in light of|given that|considering)\s+([^.]{20,200}\.?)/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(decisionDoc.text)) !== null && findings.length < 5) {
      const conclusion = match[1].trim();
      const keywords = conclusion.toLowerCase().split(/\W+/).filter((word) => word.length > 5);
      if (keywords.length < 2 || keywords.some((word) => evidenceText.includes(word))) continue;
      findings.push({
        id: crypto.randomUUID(),
        type: "unsupported_conclusion",
        title: "Conclusion may lack identifiable supporting documentation",
        description: `The decision states: "${conclusion.slice(0, 150)}". No obvious supporting match was found in the supplied evidence text.`,
        whyItMatters: "This is a screening signal, not proof that the conclusion lacks support. It identifies a point that should be checked against the complete record.",
        sources: [{ documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: conclusion }],
        claims: [{ source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: conclusion }],
        confidence: "low",
        status: "needs_review",
        suggestedGroundType: "insufficient_weight",
        suggestedClaim: `The supplied record does not clearly show the basis for the conclusion that "${conclusion.slice(0, 100)}".`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return findings;
}

function detectContradictions(docs: AnalyzedDocument[]): XRayFinding[] {
  const findings: XRayFinding[] = [];
  const negationPattern = /\b(not|no|never|denied|rejected|failed|did not|does not)\s+([a-z\s]{5,60})/gi;
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const left = docs[i];
      const right = docs[j];
      const regex = new RegExp(negationPattern.source, negationPattern.flags);
      for (const negation of left.text.matchAll(regex)) {
        const phrase = negation[2].trim().toLowerCase();
        if (phrase.length < 8) continue;
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
        const affirmation = new RegExp(`\\b(did|does|was|were|is|are|has|have|had)\\s+${escaped}`, "i");
        if (!affirmation.test(right.text)) continue;
        findings.push({
          id: crypto.randomUUID(),
          type: "contradiction",
          title: "Potential contradiction between documents",
          description: `${left.name} states "${negation[0].trim()}", while ${right.name} appears to state the opposite.`,
          whyItMatters: "A genuine contradiction may affect credibility or the factual basis of the decision, but the surrounding context should be reviewed before relying on it.",
          sources: [
            { documentId: left.id, documentName: left.name, excerpt: negation[0] },
            { documentId: right.id, documentName: right.name, excerpt: phrase },
          ],
          claims: [
            { source: { documentId: left.id, documentName: left.name }, text: negation[0].trim() },
            { source: { documentId: right.id, documentName: right.name }, text: `Affirms: ${phrase}` },
          ],
          confidence: "medium",
          status: "needs_review",
          suggestedGroundType: "contradictory_finding",
          suggestedClaim: `The supplied documents appear to conflict regarding ${phrase}.`,
          createdAt: new Date().toISOString(),
        });
        if (findings.length >= 5) return findings;
      }
    }
  }
  return findings;
}

function detectProceduralIssues(docs: AnalyzedDocument[], decision: Decision): XRayFinding[] {
  const decisionDoc = docs.find((doc) => doc.isDecision);
  if (!decisionDoc || !decision.deadline?.date) return [];
  const daysLeft = daysUntilDeadline(decision.deadline);
  if (daysLeft === null || daysLeft > 7) return [];
  const expired = daysLeft < 0;
  return [{
    id: crypto.randomUUID(),
    type: "procedural_issue",
    title: expired ? "Appeal deadline may have passed" : `Appeal deadline approaching — ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`,
    description: expired
      ? `The extracted appeal deadline is ${decision.deadline.date}, which appears to have passed.`
      : `The extracted appeal deadline is ${decision.deadline.date}. Approximately ${daysLeft} day${daysLeft === 1 ? "" : "s"} remain.`,
    whyItMatters: expired
      ? "A missed deadline can affect appeal rights, although exceptions or good-cause rules may apply. The deadline should be verified against the controlling instructions."
      : "The matter is time-sensitive. The deadline and submission method should be verified promptly.",
    sources: [{ documentId: decisionDoc.id, documentName: decisionDoc.name }],
    claims: [],
    confidence: "high",
    status: "needs_review",
    createdAt: new Date().toISOString(),
  }];
}

function detectStrengths(docs: AnalyzedDocument[]): XRayFinding[] {
  const decisionDoc = docs.find((doc) => doc.isDecision);
  if (!decisionDoc) return [];
  const findings: XRayFinding[] = [];
  const hedgePattern = /\b(may|might|appears|seemingly|arguably|presumably|likely|probably|apparently|ostensibly)\s+([a-z\s]{10,80})/gi;
  for (const hedge of decisionDoc.text.matchAll(hedgePattern)) {
    findings.push({
      id: crypto.randomUUID(),
      type: "strength",
      title: "Qualified reasoning in decision",
      description: `The decision uses qualified language: "${hedge[0].trim()}".`,
      whyItMatters: "Qualified language may identify a point that deserves closer evidentiary review; it is not, by itself, proof that the decision is weak.",
      sources: [{ documentId: decisionDoc.id, documentName: decisionDoc.name, excerpt: hedge[0] }],
      claims: [{ source: { documentId: decisionDoc.id, documentName: decisionDoc.name }, text: hedge[0].trim() }],
      confidence: "low",
      status: "needs_review",
      createdAt: new Date().toISOString(),
    });
    if (findings.length >= 3) break;
  }
  return findings;
}

function detectEvidenceGaps(findings: XRayFinding[], decision: Decision): EvidenceGap[] {
  const gaps: EvidenceGap[] = [];
  for (const finding of findings) {
    if (finding.status === "dismissed") continue;
    const add = (title: string, description: string, suggestedEvidence: string[], severity: EvidenceGap["severity"]) => {
      gaps.push({ id: crypto.randomUUID(), title, description, relatedFindingId: finding.id, suggestedEvidence, severity, status: "open", createdAt: new Date().toISOString() });
    };
    if (finding.type === "date_conflict") add("Proof of actual date", "The date discrepancy should be resolved with the strongest available contemporaneous record.", ["submission confirmation", "email receipt", "portal screenshot", "certified-mail record", "dated photograph"], "important");
    if (finding.type === "unaddressed_evidence") add("Proof that evidence was submitted", "If the appeal relies on evidence not addressed in the decision, preserve proof that it was actually submitted before the decision.", ["submission confirmation", "email receipt", "portal screenshot", "tracking number", "certified-mail receipt"], "critical");
    if (finding.type === "unsupported_conclusion") add("Record supporting or contradicting the conclusion", "Locate the source the decision relied on and any evidence that directly supports or contradicts it.", ["official record", "expert opinion", "photographs", "dated correspondence"], "important");
    if (finding.type === "contradiction") add("Corroborating evidence", "Additional reliable evidence may help resolve the apparent contradiction.", ["third-party statement", "timestamped record", "official document", "photograph with metadata"], "helpful");
  }
  if (gaps.length === 0) {
    for (const reason of decision.reasons.slice(0, 2)) {
      gaps.push({
        id: crypto.randomUUID(),
        title: `Evidence addressing: "${reason.text.slice(0, 50)}${reason.text.length > 50 ? "..." : ""}"`,
        description: "Evidence that directly addresses a stated reason for the decision may strengthen the record.",
        suggestedEvidence: ["relevant correspondence", "official records", "photographs", "expert opinion", "dated documentation"],
        severity: "important",
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
  }
  return gaps;
}

function buildAppealMap(decision: Decision, findings: XRayFinding[], evidence: Evidence[]): AppealMap {
  const rootId = crypto.randomUUID();
  const nodes: AppealMapNode[] = [{
    id: rootId,
    type: "decision",
    label: decision.agency || "The Decision",
    description: decision.decisionTypeLabel || "Decision",
    children: [],
  }];

  for (const reason of decision.reasons.slice(0, 5)) {
    const reasonId = crypto.randomUUID();
    nodes[0].children.push(reasonId);
    nodes.push({ id: reasonId, type: "reason", label: reason.text.slice(0, 80), description: "Reason given in the decision", children: [] });
    const related = findings.filter((finding) => finding.sources.some((source) => source.excerpt?.includes(reason.text.slice(0, 30))));
    for (const finding of related) {
      const weaknessId = crypto.randomUUID();
      nodes.find((node) => node.id === reasonId)?.children.push(weaknessId);
      nodes.push({ id: weaknessId, type: "weakness", label: FINDING_TYPE_LABELS[finding.type], description: finding.title, children: [], findingId: finding.id });
      const sourceIds = new Set(finding.sources.map((source) => source.documentId));
      for (const item of evidence.filter((entry) => !entry.documentId || sourceIds.has(entry.documentId))) {
        const evidenceId = crypto.randomUUID();
        nodes.find((node) => node.id === weaknessId)?.children.push(evidenceId);
        nodes.push({ id: evidenceId, type: "evidence", label: item.label, description: item.excerpt, children: [], sources: [{ documentId: item.documentId || item.id, documentName: item.documentFilename || item.label }] });
      }
      if (finding.suggestedGroundType) {
        const groundId = crypto.randomUUID();
        nodes.find((node) => node.id === weaknessId)?.children.push(groundId);
        nodes.push({ id: groundId, type: "ground", label: `Potential ${finding.suggestedGroundType.replace(/_/g, " ")}`, description: finding.suggestedClaim, children: [], findingId: finding.id });
      }
    }
  }

  if (decision.reasons.length === 0) {
    const pendingId = crypto.randomUUID();
    nodes[0].children.push(pendingId);
    nodes.push({ id: pendingId, type: "weakness", label: "Analysis pending", description: "A decision reason is needed for detailed analysis", children: [] });
  }

  const outcomeId = crypto.randomUUID();
  for (const node of nodes) if (node.type === "ground" && node.children.length === 0) node.children.push(outcomeId);
  nodes.push({ id: outcomeId, type: "outcome", label: "Appeal filed", description: "Request for reversal or reconsideration", children: [] });
  return { nodes, rootId };
}

function summarizeDocuments(docs: AnalyzedDocument[]): DocumentSummary[] {
  return docs.map((doc) => {
    const entities = new Set<string>();
    const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
    let match: RegExpExecArray | null;
    while ((match = entityPattern.exec(doc.text)) !== null && entities.size < 10) {
      if (match[1].length > 3 && !["The", "This", "That", "Your", "Dear", "From"].includes(match[1])) entities.add(match[1]);
    }
    return {
      id: doc.id,
      name: doc.name,
      pageCount: doc.pageCount,
      wordCount: doc.text.split(/\s+/).filter(Boolean).length,
      datesFound: [...new Set(extractDatesFromDoc(doc).map((date) => date.date))],
      entities: [...entities],
      role: doc.isDecision ? "decision" : "evidence",
    };
  });
}

export function runXRayAnalysis(docs: AnalyzedDocument[], decision: Decision, evidence: Evidence[] = []): XRayResult {
  const findings = [
    ...detectDateConflicts(docs),
    ...detectUnaddressedEvidence(docs, decision),
    ...detectUnsupportedConclusions(docs),
    ...detectContradictions(docs),
    ...detectProceduralIssues(docs, decision),
    ...detectStrengths(docs),
  ];
  const gaps = detectEvidenceGaps(findings, decision);
  const strongFindings = findings.filter((finding) => finding.confidence === "high").length;
  return {
    id: crypto.randomUUID(),
    totalDocuments: docs.length,
    totalPages: docs.reduce((sum, doc) => sum + doc.pageCount, 0),
    totalFindings: findings.length,
    strongFindings,
    needsEvidence: gaps.filter((gap) => gap.severity !== "helpful").length,
    contradictions: findings.filter((finding) => finding.type === "contradiction" || finding.type === "date_conflict").length,
    totalGaps: gaps.length,
    findings,
    gaps,
    map: buildAppealMap(decision, findings, evidence),
    documents: summarizeDocuments(docs),
    analyzedAt: new Date().toISOString(),
    overallConfidence: strongFindings >= 3 ? "high" : findings.length >= 2 ? "medium" : "low",
  };
}

export interface BuiltGround {
  findingId: string;
  groundType: GroundType;
  claim: string;
  source: string;
  evidenceIds: string[];
}

export function buildAppealFromXRay(findings: XRayFinding[]): BuiltGround[] {
  return findings
    .filter((finding): finding is XRayFinding & { suggestedGroundType: GroundType; suggestedClaim: string } => finding.status === "used_in_appeal" && Boolean(finding.suggestedGroundType && finding.suggestedClaim))
    .map((finding) => ({
      findingId: finding.id,
      groundType: finding.suggestedGroundType,
      claim: finding.suggestedClaim,
      source: finding.claims.map((claim) => claim.text).join(" "),
      evidenceIds: finding.sources.slice(1).map((source) => source.documentId),
    }));
}

export function updateFindingStatus(result: XRayResult, findingId: string, status: FindingStatus): XRayResult {
  return { ...result, findings: result.findings.map((finding) => finding.id === findingId ? { ...finding, status } : finding) };
}

export function updateGapStatus(result: XRayResult, gapId: string, status: EvidenceGap["status"]): XRayResult {
  return { ...result, gaps: result.gaps.map((gap) => gap.id === gapId ? { ...gap, status } : gap) };
}
