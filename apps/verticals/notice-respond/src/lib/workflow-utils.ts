/**
 * Workflow Utilities
 *
 * Helpers for:
 * - Document upload and storage
 * - Document text extraction (PDF → text)
 * - AI extraction pipeline
 * - Fact validation and conflict detection
 * - Evidence linking
 */

import { supabase } from "./supabase";
import { LLMRouter } from "@mailmypdf/ai";
import {
  CP2000_DOMAIN_PACK,
} from "@mailmypdf/workflows";
import type { VerifiedFact, Document } from "@mailmypdf/workflows";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────
// DOCUMENT UPLOAD & STORAGE
// ─────────────────────────────────────────────────────────────────────

export interface UploadDocumentOptions {
  file: File;
  matterId: string;
  userId: string;
  classification?: string;
}

/**
 * Upload a document to Supabase Storage and create a Document record
 */
export async function uploadDocument(
  options: UploadDocumentOptions,
): Promise<Document> {
  const { file, matterId, userId, classification } = options;

  // Generate storage path
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  const storageKey = `matters/${matterId}/documents/${timestamp}-${random}-${file.name}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storageKey, file);

  if (uploadError) {
    throw new Error(`Failed to upload document: ${uploadError.message}`);
  }

  // Create Document record
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .insert({
      matter_id: matterId,
      owner_id: userId,
      filename: file.name,
      mime_type: file.type,
      size: file.size,
      classification: classification || "other",
      storage_key: storageKey,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (docError) {
    // Clean up uploaded file
    await supabase.storage.from("documents").remove([storageKey]);
    throw new Error(`Failed to create document record: ${docError.message}`);
  }

  return {
    id: docData.id,
    ownerId: docData.owner_id,
    matterId: docData.matter_id,
    filename: docData.filename,
    mimeType: docData.mime_type,
    size: docData.size,
    classification: docData.classification,
    uploadedAt: docData.uploaded_at,
    storageKey: docData.storage_key,
  };
}

// ─────────────────────────────────────────────────────────────────────
// PDF TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────────────

/**
 * Extract text from a PDF file
 * (Stub - requires pdf-parse or similar library)
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // In production, use pdf-parse or pdfjs
  // const PDFParser = require("pdf-parse");
  // const data = await PDFParser(file);
  // return data.text;

  // For now, return stub
  return `[PDF text from ${file.name} - requires pdf-parse implementation]`;
}

// ─────────────────────────────────────────────────────────────────────
// AI EXTRACTION PIPELINE
// ─────────────────────────────────────────────────────────────────────

export interface ExtractionResult {
  facts: VerifiedFact[];
  confidence: number;
  provenance: {
    provider: string;
    model: string;
    tokens: number;
    costUSD: number;
  };
}

/**
 * Extract structured facts from document text using LLM
 */
export async function extractFactsFromDocument(
  documentText: string,
  matterId: string,
  domainPack = CP2000_DOMAIN_PACK,
): Promise<ExtractionResult> {
  const router = LLMRouter.fromEnv();

  const result = await router.call({
    id: `extract-${matterId}`,
    prompt: domainPack.analysisPrompt || "Extract key information",
    schema: domainPack.extractionSchema as Record<string, unknown>,
    maxTokens: 2000,
  });

  if (!result.ok) {
    throw new Error(`AI extraction failed: ${result.error}`);
  }

  const { content, tokensUsed, costUSD, confidence } = result.value;

  // Convert AI output to VerifiedFacts
  const facts: VerifiedFact[] = [];

  if (typeof content === "object" && content !== null) {
    const extracted = content as Record<string, unknown>;

    // Parse extracted data into VerifiedFacts
    // This is domain-specific and would vary by domain pack
    // For CP2000, we'd extract: noticeType, taxYear, deadline, etc.

    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== undefined) {
        facts.push({
          id: `fact-${matterId}-${key}` as any,
          matterId: matterId as any,
          category: key,
          value,
          confidence: (confidence || 0.8) as any,
          sourceType: "document_extracted",
          sourceDocumentId: undefined,
        });
      }
    }
  }

  return {
    facts,
    confidence: confidence || 0.8,
    provenance: {
      provider: "anthropic",
      model: "claude-opus-4-1",
      tokens: tokensUsed,
      costUSD,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// FACT VALIDATION & CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────────

export interface FactConflict {
  category: string;
  extracted: unknown;
  existing: unknown;
  resolutionNeeded: boolean;
}

/**
 * Check for conflicts between newly extracted facts and existing facts
 */
export function detectConflicts(
  newFacts: VerifiedFact[],
  existingFacts: VerifiedFact[],
): FactConflict[] {
  const conflicts: FactConflict[] = [];

  for (const newFact of newFacts) {
    const existing = existingFacts.find(
      (f) => f.category === newFact.category,
    );

    if (existing && existing.value !== newFact.value) {
      conflicts.push({
        category: newFact.category,
        extracted: newFact.value,
        existing: existing.value,
        resolutionNeeded: true,
      });
    }
  }

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────
// DRAFT GENERATION
// ─────────────────────────────────────────────────────────────────────

export interface DraftGenerationOptions {
  matterId: string;
  facts: VerifiedFact[];
  strategy: Record<string, unknown>;
  domainPack: typeof CP2000_DOMAIN_PACK;
}

/**
 * Generate a professional response draft using LLM
 */
export async function generateDraft(
  options: DraftGenerationOptions,
): Promise<string> {
  const { matterId, facts, strategy, domainPack } = options;

  // Build context from facts and strategy
  const factsText = facts
    .map((f) => `${f.category}: ${f.value}`)
    .join("\n");

  const strategyText = Object.entries(strategy)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `
${domainPack.draftPrompt || "Generate a professional response"}

EXTRACTED FACTS:
${factsText}

USER'S POSITION:
${strategyText}

Generate a professional response letter.`;

  const router = LLMRouter.fromEnv();

  const result = await router.call({
    id: `draft-${matterId}`,
    prompt,
    maxTokens: 3000,
  });

  if (!result.ok) {
    throw new Error(`Draft generation failed: ${result.error}`);
  }

  // In production, parse and format the response
  // For now, return raw content
  return typeof result.value.content === "string"
    ? result.value.content
    : JSON.stringify(result.value.content);
}

// ─────────────────────────────────────────────────────────────────────
// APPROVAL & INTEGRITY
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate SHA-256 hash of packet contents for integrity verification
 */
export function generatePacketHash(
  artifacts: string[],
): string {
  const content = artifacts.join("\n");
  return crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");
}

/**
 * Verify packet hash (ensures packet hasn't been modified after approval)
 */
export function verifyPacketHash(
  artifacts: string[],
  expectedHash: string,
): boolean {
  const actualHash = generatePacketHash(artifacts);
  return actualHash === expectedHash;
}

// ─────────────────────────────────────────────────────────────────────
// FACT PERSISTENCE
// ─────────────────────────────────────────────────────────────────────

/**
 * Save verified facts to database
 */
export async function persistFacts(
  matterId: string,
  facts: VerifiedFact[],
): Promise<void> {
  // Store facts in the case's data JSONB, or in a separate table
  const { error } = await supabase
    .from("cases")
    .update({
      data: { verifiedFacts: facts },
      updated_at: new Date().toISOString(),
    })
    .eq("id", matterId);

  if (error) {
    throw new Error(`Failed to persist facts: ${error.message}`);
  }
}

/**
 * Load verified facts from database
 */
export async function loadFacts(matterId: string): Promise<VerifiedFact[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("data")
    .eq("id", matterId)
    .single();

  if (error) {
    throw new Error(`Failed to load facts: ${error.message}`);
  }

  return (data?.data?.verifiedFacts || []) as VerifiedFact[];
}
