/**
 * AppealReply Draft Model — Evidence-linked Appeal Drafting
 *
 * The structured output of Phase C's drafting layer.
 * Transforms the case analysis (Phase B) + verified facts + user grounds
 * into a formal appeal draft with:
 *
 * - A complete appeal letter (editable)
 * - Structured sections, each linked to supporting evidence
 * - An exhibit list with availability status
 * - Warnings about unsupported claims or missing evidence
 *
 * This is the final product before Phase D (mail + proof) takes over
 * to physically mail the appeal and preserve delivery evidence.
 */

import { z } from "zod";

// ── Evidence Reference (links a claim to specific evidence) ──────────────────

export const EvidenceReferenceSchema = z.object({
  claim: z.string().min(1),
  exhibitId: z.string().min(1),
  evidenceDescription: z.string().min(1),
  source: z.string().default(""),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

// ── Appeal Section (a paragraph/argument block with evidence links) ──────────

export const AppealSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  evidenceReferences: z.array(EvidenceReferenceSchema).default([]),
});
export type AppealSection = z.infer<typeof AppealSectionSchema>;

// ── Exhibit (a piece of evidence referenced in the appeal) ───────────────────

export const ExhibitStatusSchema = z.enum(["available", "needed", "pending"]);
export type ExhibitStatus = z.infer<typeof ExhibitStatusSchema>;

export const ExhibitSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  source: z.string().default(""),
  status: ExhibitStatusSchema.default("needed"),
});
export type Exhibit = z.infer<typeof ExhibitSchema>;

// ── Address Block ─────────────────────────────────────────────────────────────

export const AddressBlockSchema = z.object({
  name: z.string().default(""),
  line1: z.string().default(""),
  line2: z.string().optional(),
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
});
export type AddressBlock = z.infer<typeof AddressBlockSchema>;

// ── Full Appeal Draft ─────────────────────────────────────────────────────────

export const AppealDraftSchema = z.object({
  letterText: z.string().min(1),
  sections: z.array(AppealSectionSchema).default([]),
  exhibits: z.array(ExhibitSchema).default([]),
  recipient: AddressBlockSchema,
  warnings: z.array(z.string()).default([]),
});
export type AppealDraft = z.infer<typeof AppealDraftSchema>;

// ── API Input ────────────────────────────────────────────────────────────────

export const QuestionAnswersSchema = z.record(z.string(), z.string());
export type QuestionAnswers = z.infer<typeof QuestionAnswersSchema>;

export const DraftAppealInputSchema = z.object({
  caseAnalysis: z.record(z.unknown()),
  verifiedFacts: z.object({
    decisionType: z.string().default(""),
    decisionDate: z.string().default(""),
    deadline: z.string().default(""),
    decisionMaker: z.string().default(""),
    reason: z.string().default(""),
  }),
  grounds: z.string().min(1, "User's grounds for appeal are required"),
  questionAnswers: QuestionAnswersSchema.default({}),
  sender: AddressBlockSchema,
  recipient: AddressBlockSchema,
});
export type DraftAppealInput = z.infer<typeof DraftAppealInputSchema>;
