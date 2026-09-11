import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { compoundWorkflowList } from "@/domain/compound-workflows";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const WorkflowDirectory = createWorkflowDirectory(createElement);

export const Route = createFileRoute("/workflows/")({ component: WorkflowDirectoryPage });

function WorkflowDirectoryPage() {
  const standardItems = Object.values(workflows).map((workflow) => {
    const profile = workflowProfiles[workflow.id];
    return {
      id: workflow.id,
      title: workflow.title,
      category: profile.family,
      description: profile.outcome ?? workflow.description,
      href: `/workflows/${workflow.id}`,
      badge: workflow.lifecycle === "gold" ? "Gold workflow" : workflow.lifecycle,
      meta: profile.primaryKeyword,
      keywords: [profile.primaryKeyword, ...profile.supportingKeywords],
    };
  });

  const compoundItems = compoundWorkflowList.map((workflow) => ({
    id: workflow.id,
    title: workflow.title,
    category: workflow.family,
    description: workflow.majorOutcome,
    href: `/workflows/${workflow.id}`,
    badge: "Compound workflow",
    meta: workflow.primaryKeyword,
    keywords: [
      workflow.primaryKeyword,
      ...workflow.phases.flatMap((phase) => phase.capabilities),
    ],
  }));

  const items = [...compoundItems, ...standardItems];
  const families = [...new Set(items.map((item) => item.category))];

  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />
      <WorkflowDirectory
        productName="Private Office"
        title="Choose the matter that needs a documented response."
        description="Private Office is the high-control correspondence and legal-operations layer for consequential personal, property, financial, estate, and government matters. Compound workflows can coordinate multiple governed operations while preserving evidence, chronology, review, authorization, delivery, and proof."
        items={items}
        categories={families.map((family) => ({ id: family, label: family }))}
        searchPlaceholder="Search defense, property, estate, government records, contractor, trust, bank wire…"
        helperTitle="Not sure which Private Office matter fits?"
        helperDescription="Start from the outcome you need. Compound workflows coordinate multiple operations for major matters; focused workflows handle a specific correspondence or dispute."
        helperHref="/workflows"
        helperLabel="Browse Private Matters"
        steps={[
          { title: "Choose the objective", description: "Select a compound operation for a major matter or a focused workflow for a specific dispute, claim, trust, banking, or property issue." },
          { title: "Build the evidence record", description: "Organize documents, chronology, facts, authority, and source-linked evidence before consequential action." },
          { title: "Pass the gates", description: "Resolve evidence, authority, deadline, professional-review, and human-approval gates as the matter progresses." },
          { title: "Act & preserve proof", description: "Only approved actions move forward; delivery, tracking, and proof remain attached to the matter record." },
        ]}
        finalTitle="Discreet operations. Complete record."
        finalDescription="Choose the objective, build the record carefully, and retain control over what gets approved, sent, filed, or escalated."
        finalHref="/workflows"
        finalLabel="Choose a Private Matter"
      />
    </main>
  );
}
