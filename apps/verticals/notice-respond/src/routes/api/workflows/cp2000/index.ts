/**
 * CP2000 Workflow API Endpoints
 *
 * Handles backend operations:
 * - Create new workflow
 * - Load current workflow
 * - Update workflow status
 * - Persist verified facts
 * - Persist evidence selection
 * - Complete workflow
 * - Trigger AI analysis
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "@/lib/auth-middleware";
import { supabase } from "@/lib/supabase";
import { LLMRouter } from "@mailmypdf/ai";
import { CP2000_DOMAIN_PACK } from "@mailmypdf/workflows";
import type {
  Matter,
  Document,
  VerifiedFact,
  EvidenceItem,
} from "@mailmypdf/workflows";

const router = Router();

// ─────────────────────────────────────────────────────────────────────
// CREATE WORKFLOW
// ─────────────────────────────────────────────────────────────────────

router.post("/create", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { workflowType = "cp2000" } = req.body;

    // Create new matter in database
    const { data: matter, error } = await supabase
      .from("cases")
      .insert({
        owner_id: userId,
        status: "intake",
        notice_type: "cp2000",
        data: {
          workflowType,
          createdAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to create workflow" });
    }

    res.json({
      matter: {
        id: matter.id,
        ownerId: matter.owner_id,
        workflowId: matter.id,
        workflowType: "cp2000",
        status: matter.status,
        createdAt: matter.created_at,
        updatedAt: matter.updated_at,
        data: matter.data || {},
      } as Matter,
    });
  } catch (err) {
    console.error("Error creating workflow:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET CURRENT WORKFLOW
// ─────────────────────────────────────────────────────────────────────

router.get("/current", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get most recent CP2000 workflow in progress
    const { data: cases } = await supabase
      .from("cases")
      .select("*")
      .eq("owner_id", userId)
      .eq("notice_type", "cp2000")
      .in("status", ["intake", "analysis", "review", "evidence", "strategy", "produce", "approve", "fulfill"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!cases) {
      return res.json({ matter: null });
    }

    res.json({
      matter: {
        id: cases.id,
        ownerId: cases.owner_id,
        workflowId: cases.id,
        workflowType: "cp2000",
        status: cases.status,
        createdAt: cases.created_at,
        updatedAt: cases.updated_at,
        data: cases.data || {},
      } as Matter,
    });
  } catch (err) {
    console.error("Error fetching current workflow:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────
// UPDATE WORKFLOW STATUS
// ─────────────────────────────────────────────────────────────────────

router.patch(
  "/:matterId/update",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { status, data } = req.body;

      // Verify ownership
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!existing) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Update matter
      const { data: updated, error } = await supabase
        .from("cases")
        .update({
          status,
          data: data || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", matterId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update workflow" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating workflow:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// PERSIST VERIFIED FACTS
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/:matterId/facts",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { facts } = req.body;

      // Verify ownership
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!existing) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Store facts (implementation depends on schema)
      // For now, store in cases.data
      const { error } = await supabase
        .from("cases")
        .update({
          data: { verifiedFacts: facts },
          updated_at: new Date().toISOString(),
        })
        .eq("id", matterId);

      if (error) {
        return res.status(500).json({ error: "Failed to save facts" });
      }

      res.json({ success: true, factsCount: facts.length });
    } catch (err) {
      console.error("Error saving facts:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// PERSIST EVIDENCE SELECTION
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/:matterId/evidence",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { evidence } = req.body;

      // Verify ownership
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!existing) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Store evidence selection
      const { error } = await supabase
        .from("cases")
        .update({
          data: { selectedEvidence: evidence },
          updated_at: new Date().toISOString(),
        })
        .eq("id", matterId);

      if (error) {
        return res.status(500).json({ error: "Failed to save evidence" });
      }

      res.json({ success: true, evidenceCount: evidence.length });
    } catch (err) {
      console.error("Error saving evidence:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// LOAD RELATED DATA
// ─────────────────────────────────────────────────────────────────────

router.get(
  "/:matterId/documents",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Verify ownership
      const { data: caseData } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!caseData) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Fetch documents (schema depends on implementation)
      // For now, return empty - will be populated by upload API
      res.json({ documents: [] as Document[] });
    } catch (err) {
      console.error("Error loading documents:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/:matterId/facts",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Verify ownership
      const { data: caseData } = await supabase
        .from("cases")
        .select("data")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!caseData) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      const facts = caseData.data?.verifiedFacts || [];
      res.json({ facts });
    } catch (err) {
      console.error("Error loading facts:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/:matterId/evidence",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Verify ownership
      const { data: caseData } = await supabase
        .from("cases")
        .select("data")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!caseData) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      const evidence = caseData.data?.selectedEvidence || [];
      res.json({ evidence });
    } catch (err) {
      console.error("Error loading evidence:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// COMPLETE WORKFLOW
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/:matterId/complete",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Verify ownership
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!existing) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Mark as complete
      const { error } = await supabase
        .from("cases")
        .update({
          status: "complete",
          has_mailing: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matterId);

      if (error) {
        return res.status(500).json({ error: "Failed to complete workflow" });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error completing workflow:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// TRIGGER AI ANALYSIS (Stub)
// ─────────────────────────────────────────────────────────────────────

router.post(
  "/:matterId/analyze",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { matterId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { documentText } = req.body;

      // Verify ownership
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("id", matterId)
        .eq("owner_id", userId)
        .single();

      if (!existing) {
        return res.status(403).json({ error: "Not found or unauthorized" });
      }

      // Call LLM router
      const router = LLMRouter.fromEnv();
      const result = await router.call({
        id: `cp2000-extract-${matterId}`,
        prompt: CP2000_DOMAIN_PACK.analysisPrompt || "Extract CP2000 data",
        schema: CP2000_DOMAIN_PACK.extractionSchema,
      });

      if (!result.ok) {
        return res.status(500).json({
          error: "AI analysis failed",
          details: String(result.error),
        });
      }

      const { content, tokensUsed, costUSD } = result.value;

      res.json({
        extracted: content,
        provenance: {
          provider: "anthropic",
          model: "claude-opus-4-1",
          tokens: tokensUsed,
          costUSD,
        },
      });
    } catch (err) {
      console.error("Error during analysis:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
