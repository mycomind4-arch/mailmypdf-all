import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://dispute-mail.pages.dev";
const WorkflowDirectory = createWorkflowDirectory(createElement);
const groups = [
  { title: "Debt & Collections", ids: ["debt-collection-dispute", "dispute-collection-agency", "debt-dispute", "debt-validation", "medical-collections", "cease-contact", "fdcpa-dispute", "debt-lawsuit-response"] },
  { title: "Credit Reports", ids: ["credit-report", "credit-report-collections", "hard-inquiry", "charge-off", "student-loan", "transunion-dispute", "experian-dispute", "equifax-dispute", "lexisnexis-dispute", "fcra-dispute"] },
  { title: "Billing & Transactions", ids: ["credit-card-billing", "unauthorized-charge", "billing-error", "subscription-billing", "service-contract", "insurance-billing"] },
  { title: "Follow-up & Escalation", ids: ["follow-up-no-response", "inadequate-response"] },
] as const;

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Dispute Workflows | Credit, Debt & Billing | Dispute Mail" },
      { name: "description", content: "Browse Dispute Mail workflows for credit reports, debt and collection disputes, billing errors, unauthorized charges, and unresolved dispute follow-up." },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/workflows" }],
  }),
  component: Page,
});

function Page() {
  const all = groups.flatMap(group => group.ids.map(id => ({ group: group.title, id, workflow: workflows[id as keyof typeof workflows], profile: workflowProfiles[id as keyof typeof workflowProfiles] }))).filter(item => item.workflow);
  const items = all.map(({ group, id, workflow, profile }) => ({
    id,
    title: workflow.title,
    category: group,
    description: workflow.description,
    href: `/workflows/${id}`,
    badge: workflow.lifecycle === "gold" ? "Gold" : "Available",
    meta: profile?.primaryKeyword,
    keywords: [id, profile?.primaryKeyword ?? ""],
  }));
  return <main><SiteHeader/><WorkflowDirectory
    productName="Dispute Mail"
    title="Find the dispute workflow that matches the exact problem."
    description="Search by the account, statement, collector, credit bureau, charge, billing problem, or unresolved response in front of you. Each workflow keeps its own evidence and response path."
    items={items}
    categories={groups.map(group => ({ id: group.title, label: group.title }))}
    searchPlaceholder="Search debt, collections, credit report, billing, unauthorized charge…"
    helperTitle="Not sure which dispute workflow fits?"
    helperDescription="Start with what appears on the notice, statement, credit report, or collector correspondence and choose the closest problem-specific workflow."
    helperHref="/write-a-dispute-letter"
    helperLabel="Find My Dispute"
    steps={[
      { title: "Choose the dispute", description: "Match the account, report, bill, transaction, or collection issue to the right workflow." },
      { title: "Add the record", description: "Upload the notice or statement and organize the facts and supporting evidence." },
      { title: "Prepare and review", description: "Build a focused dispute and review every fact and attachment before approval." },
      { title: "Send and keep proof", description: "Download the dispute or choose MailMyPDF mailing, tracking, and proof options." },
    ]}
    finalTitle="Make the dispute specific. Keep the record complete."
    finalDescription="Choose the workflow that matches the problem and keep the original document, evidence, response, mailing, and proof together."
    finalHref="/write-a-dispute-letter"
    finalLabel="Find My Dispute"
  /><SiteFooter/></main>;
}
