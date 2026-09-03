/**
 * CP2000 Workflow Route
 *
 * Integrates AuthenticatedWorkflowShell with notice-respond's database
 * and authentication layer.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  AuthenticatedWorkflowShell,
  CP2000_DOMAIN_PACK,
} from "@mailmypdf/workflows";
import type {
  Matter,
  Document,
  VerifiedFact,
  EvidenceItem,
  MatterId,
} from "@mailmypdf/workflows";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/workflows/cp2000-workflow")({
  head: () => ({
    meta: [
      { title: "CP2000 Response Workflow — MailMyPDF" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CP2000WorkflowPage,
});

function CP2000WorkflowPage() {
  const navigate = useNavigate();
  const { user, accessToken, loading: authLoading } = useAuth();

  // Workflow state
  const [matter, setMatter] = useState<Matter | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [verifiedFacts, setVerifiedFacts] = useState<VerifiedFact[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load or create matter on mount
  useEffect(() => {
    if (authLoading || !user || !accessToken) return;

    const initializeWorkflow = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if user has an existing CP2000 matter in progress
        const existingResponse = await fetch("/api/workflows/cp2000/current", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (existingResponse.ok) {
          const { matter: existingMatter } = await existingResponse.json();
          if (existingMatter) {
            setMatter(existingMatter);
            // Load related data
            await loadWorkflowState(existingMatter.id, accessToken);
            setLoading(false);
            return;
          }
        }

        // Create new matter
        const createResponse = await fetch("/api/workflows/cp2000/create", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowType: "cp2000",
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create workflow");
        }

        const { matter: newMatter } = await createResponse.json();
        setMatter(newMatter);
        setLoading(false);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize workflow";
        setError(message);
        setLoading(false);
      }
    };

    void initializeWorkflow();
  }, [authLoading, user, accessToken]);

  // Load workflow state (documents, facts, evidence)
  const loadWorkflowState = async (matterId: string, token: string) => {
    try {
      const [docsRes, factsRes, evidenceRes] = await Promise.all([
        fetch(`/api/workflows/cp2000/${matterId}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/workflows/cp2000/${matterId}/facts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/workflows/cp2000/${matterId}/evidence`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (docsRes.ok) {
        const { documents: docs } = await docsRes.json();
        setDocuments(docs || []);
      }
      if (factsRes.ok) {
        const { facts } = await factsRes.json();
        setVerifiedFacts(facts || []);
      }
      if (evidenceRes.ok) {
        const { evidence: evid } = await evidenceRes.json();
        setEvidence(evid || []);
      }
    } catch (err) {
      console.error("Error loading workflow state:", err);
    }
  };

  // Callbacks for shell
  const handleMatterUpdate = async (updatedMatter: Matter) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `/api/workflows/cp2000/${updatedMatter.id}/update`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: updatedMatter.status,
            data: updatedMatter.data,
          }),
        },
      );

      if (response.ok) {
        setMatter(updatedMatter);
      } else {
        setError("Failed to update workflow status");
      }
    } catch (err) {
      setError("Network error updating workflow");
    }
  };

  const handleFactsConfirmed = async (facts: VerifiedFact[]) => {
    if (!matter || !accessToken) return;

    try {
      const response = await fetch(
        `/api/workflows/cp2000/${matter.id}/facts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ facts }),
        },
      );

      if (response.ok) {
        setVerifiedFacts(facts);
      } else {
        setError("Failed to save verified facts");
      }
    } catch (err) {
      setError("Network error saving facts");
    }
  };

  const handleEvidenceSelected = async (selectedEvidence: EvidenceItem[]) => {
    if (!matter || !accessToken) return;

    try {
      const response = await fetch(
        `/api/workflows/cp2000/${matter.id}/evidence`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ evidence: selectedEvidence }),
        },
      );

      if (response.ok) {
        setEvidence(selectedEvidence);
      } else {
        setError("Failed to save evidence selection");
      }
    } catch (err) {
      setError("Network error saving evidence");
    }
  };

  const handleWorkflowComplete = async (completedMatter: Matter) => {
    if (!accessToken) return;

    try {
      await fetch(
        `/api/workflows/cp2000/${completedMatter.id}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completedMatter),
        },
      );

      // Redirect to dashboard
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError("Failed to complete workflow");
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="text-sm text-muted-foreground">
            Loading your CP2000 workflow…
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Auth required
  if (!user || !accessToken) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h1 className="font-serif text-4xl">Sign in to continue</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            You must be signed in to your MailMyPDF account to use workflows.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Error state
  if (error && !matter) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h1 className="font-serif text-4xl">Unable to start workflow</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
          >
            Back to Dashboard
          </button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Main workflow
  if (!matter) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="text-sm text-muted-foreground">
            Initializing workflow…
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <AuthenticatedWorkflowShell
          domainPack={CP2000_DOMAIN_PACK}
          userId={user.id}
          matter={matter}
          documents={documents}
          verifiedFacts={verifiedFacts}
          evidence={evidence}
          onMatterUpdate={handleMatterUpdate}
          onFactsConfirmed={handleFactsConfirmed}
          onEvidenceSelected={handleEvidenceSelected}
          onWorkflowComplete={handleWorkflowComplete}
        />

        {error && (
          <div className="mt-6 rounded border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
