import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { IMMIGRATION_WORKFLOWS, getWorkflowRoute } from "@/lib/immigration-workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createWorkflowDirectory } from "../../../../../../packages/design-system/src/index";

const WorkflowDirectory = createWorkflowDirectory(createElement);

const categoryFor = (slug: string, intent: string) => {
  const value = `${slug} ${intent}`.toLowerCase();
  if (value.includes('foia') || value.includes('records') || value.includes('g-639')) return 'Immigration Records & FOIA';
  if (value.includes('rfe')) return 'Requests for Evidence';
  if (value.includes('noid') || value.includes('denial') || value.includes('rejection')) return 'Denials & Intent to Deny';
  if (value.includes('visa') || value.includes('consular') || value.includes('221')) return 'Visa & Consular';
  if (value.includes('i-130') || value.includes('i-140') || value.includes('i-485') || value.includes('i-751') || value.includes('n-400')) return 'Petition & Application Notices';
  return 'USCIS Notices & Correspondence';
};
const categories = ['USCIS Notices & Correspondence','Requests for Evidence','Denials & Intent to Deny','Petition & Application Notices','Visa & Consular','Immigration Records & FOIA'];

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Immigration Mail Workflows | USCIS, RFE, FOIA & Immigration Records" },
      { name: "description", content: "Browse focused Immigration Mail workflows for USCIS notices, RFE responses, NOIDs, denials, immigration FOIA requests, visa refusals, and supporting correspondence." },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/workflows" }],
  }),
  component: Page,
});

function Page() {
  const items = IMMIGRATION_WORKFLOWS.map(workflow => ({
    id: workflow.slug,
    title: workflow.title,
    category: categoryFor(workflow.slug, workflow.intent),
    description: workflow.description,
    href: getWorkflowRoute(workflow.slug),
    eyebrow: workflow.intent,
    keywords: [workflow.primaryKeyword, ...workflow.relatedTerms],
  }));

  return <main><SiteHeader/><WorkflowDirectory
    productName="Immigration Mail"
    title="Find the immigration workflow that matches your notice or task."
    description="Start with the exact USCIS notice, evidence request, denial, visa refusal, or records task in front of you. Browse by document family or search the complete public catalog before entering the private workflow."
    items={items}
    categories={categories.map(category => ({ id: category, label: category }))}
    searchPlaceholder="Search I-797, RFE, NOID, I-130, I-485, visa refusal, FOIA…"
    helperTitle="Have an immigration letter but not sure what it is?"
    helperDescription="Use the form number, agency, and notice title printed on the document to narrow this directory. Immigration Mail keeps extracted facts reviewable and does not infer requirements from a form number alone."
    helperHref="/workflows"
    helperLabel="Browse All Immigration Workflows"
    steps={[
      { title: "Understand", description: "Start from the actual notice or task and preserve the agency, form, dates, and stated request." },
      { title: "Structure", description: "Organize the requested information, source documents, and evidence without inventing missing facts." },
      { title: "Prepare & review", description: "Build the correspondence or packet and review every consequential detail before approval." },
      { title: "Send, track & prove", description: "Download the result or use MailMyPDF mailing and proof options when appropriate." },
    ]}
    finalTitle="Prepare the correspondence around the document you actually received."
    finalDescription="Choose the focused Immigration Mail workflow, keep source material and generated suggestions distinct, and review the exact packet before anything is sent."
    finalHref="/workflows"
    finalLabel="Choose a Workflow"
  /><SiteFooter/></main>;
}
