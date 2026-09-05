import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const WorkflowDirectory = createWorkflowDirectory(createElement);

export const Route = createFileRoute("/workflows/")({ component: WorkflowDirectoryPage });

function WorkflowDirectoryPage() {
  const items = Object.values(workflows).map((workflow) => {
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
  const families = [...new Set(items.map((item) => item.category))];

  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />
      <WorkflowDirectory
        productName="Private Office"
        title="Choose the matter that needs a documented response."
        description="Private Office is the high-control correspondence layer for consequential personal and financial matters. Each workflow preserves evidence, chronology, review, authorization, delivery, and proof in one matter record."
        items={items}
        categories={families.map((family) => ({ id: family, label: family }))}
        searchPlaceholder="Search contractor, property insurance, bank wire, trust, security deposit…"
        helperTitle="Not sure which Private Office matter fits?"
        helperDescription="Start from the party you need to correspond with and the record you need to preserve. The catalog only lists governed Private Office workflows that exist today."
        helperHref="/workflows"
        helperLabel="Browse Private Matters"
        steps={[
          { title: "Choose the matter", description: "Select the governed workflow matched to the dispute, claim, trust, banking, or property matter." },
          { title: "Build the evidence record", description: "Organize documents, chronology, facts, and source-linked evidence before drafting." },
          { title: "Prepare & authorize", description: "Review the correspondence and consequential actions before explicit approval." },
          { title: "Deliver & preserve proof", description: "Use MailMyPDF mailing and proof controls when the matter is ready to send." },
        ]}
        finalTitle="Discreet correspondence. Complete record."
        finalDescription="Choose the matter, build the record carefully, and retain control of what gets approved and sent."
        finalHref="/workflows"
        finalLabel="Choose a Private Matter"
      />
    </main>
  );
}
