import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  
  Eye,
  Scale,
  Calendar,
} from "lucide-react";
import { WorkflowAuthorityPage, type AuthoritySection, type IntakeField } from "@/components/workflow-authority-page";
import { workflowProfiles } from "@/domain/workflow-profiles";

export const Route = createFileRoute("/workflows/contractor-dispute")({
  head: () => ({
    meta: [
      { title: "Contractor Dispute Letter — Prepare, Review, Send & Prove | Private Office" },
      { name: "description", content: "Prepare a professional contractor dispute letter for defective work, incomplete work, billing disputes, or breach of agreement. Organize evidence, build a timeline, review the draft, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Contractor Dispute Letter — Private Office" },
      { property: "og:description", content: "Document your contractor dispute with evidence, timeline, and professional correspondence. Certified mail with proof of delivery." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="contractor-dispute" authoritySections={authoritySections} intakeFields={intakeFields} />,
});

const profile = workflowProfiles["contractor-dispute"];

const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A contractor dispute letter formally documents your position when a contractor has performed defective work, left work incomplete, disputed billing, or breached your agreement. The letter creates a clear factual record, identifies the issues, states the requested resolution, and establishes a timeline for response — all of which may be critical if the matter escalates to a demand letter, insurance claim, or legal proceeding." },
  { icon: CheckCircle2, title: "When to use this workflow", items: [
    "The contractor performed defective, substandard, or non-compliant work",
    "Work was left incomplete or abandoned before finishing the agreed scope",
    "You were overcharged, billed for work not performed, or billed beyond the contract",
    "The contractor failed to obtain required permits or inspections",
    "The contractor's work caused property damage or required remediation",
    "You need to document the dispute formally before escalating",
  ]},
  { icon: AlertTriangle, title: "When not to use this workflow", items: [
    "You need immediate emergency repairs to prevent ongoing damage — call a qualified contractor first",
    "You are facing a lien or lawsuit from the contractor — consult an attorney immediately",
    "The dispute involves personal injury — seek medical and legal attention",
    "You want to file a contractor license board complaint — that requires a separate formal process",
  ]},
  { icon: Scale, title: "Documents to gather", items: profile.evidenceRequirements },
  { icon: Calendar, title: "Deadlines and timing", content: "Capture all dates visible in your agreement, invoices, and correspondence. Some contracts include cure periods or response deadlines. Statutes of limitations for construction defects vary by state. Do not assume a specific deadline — surface the date facts for your review and consult an attorney if you are unsure about limitation periods." },
  { icon: ShieldCheck, title: "Evidence checklist", items: [
    "Photos showing the defect, incomplete work, or damage",
    "The written contract or agreement (or documentation of any oral agreement)",
    "Invoices and payment records showing what was billed and paid",
    "Correspondence: emails, texts, or letters with the contractor",
    "Permits, inspection reports, or code violation notices",
    "Any contractor proposals, change orders, or scope documents",
    "Repair estimates from other contractors for remediation",
  ]},
  { icon: Eye, title: "How the workflow works", items: [
    "Intake: Provide property/project details, contractor information, and describe the dispute",
    "Documents: Upload or reference relevant contracts, invoices, and photos",
    "Analysis: The system identifies facts, missing information, and risks",
    "Evidence: Organize supporting documents and link them to factual assertions",
    "Timeline: Build a chronology from the dates in your materials",
    "Draft: A professional dispute letter is generated from your facts",
    "Review: You review and edit the draft before anything is sent",
    "Approval: You explicitly approve the draft before mailing",
    "Delivery: Certified mail with tracking and proof of delivery",
    "Proof: Permanent record of mailing, delivery, and correspondence",
  ]},
  { icon: AlertTriangle, title: "Common mistakes", items: [
    "Waiting too long after discovering the defect to document it",
    "Not preserving photos and physical evidence before remediation",
    "Making verbal agreements without written confirmation",
    "Paying disputed invoices without documenting the dispute in writing",
    "Sending emotional or threatening communications instead of factual documentation",
    "Not sending the dispute via certified mail with proof of delivery",
  ]},
  { icon: Mail, title: "Mailing, tracking, and proof", content: "Your final letter is printed, enveloped, and mailed via USPS. Certified mail with return receipt provides signature tracking and proof of delivery — your permanent record that the contractor received your dispute letter. This documentation may be critical if the matter escalates to a demand letter, insurance claim, or legal proceeding." },
];

const intakeFields: IntakeField[] = [
  { key: "propertyAddress", label: "Property or project address *", placeholder: "123 Main Street, Springfield, IL" },
  { key: "contractorName", label: "Contractor name *", placeholder: "ABC Construction LLC" },
  { key: "agreementReference", label: "Agreement or contract reference *", placeholder: "Written contract dated January 15, 2026" },
  { key: "disputeDescription", label: "Description of dispute or defect *", placeholder: "Describe the defective work, incomplete work, billing dispute, or other issue...", type: "textarea", rows: 4 },
];
