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

export const Route = createFileRoute("/workflows/property-insurance-claim")({
  head: () => ({
    meta: [
      { title: "Property Insurance Claim Letter — Document, Dispute & Appeal | Private Office" },
      { name: "description", content: "Prepare a professional property insurance claim letter for denied claims, underpayments, disputed scope, delayed responses, or supplemental claims. Organize evidence, build a chronology, review the draft, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Property Insurance Claim Letter — Private Office" },
      { property: "og:description", content: "Document your property insurance claim with evidence, chronology, and professional correspondence. Certified mail with proof of delivery." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="property-insurance-claim" authoritySections={authoritySections} intakeFields={intakeFields} />,
});

const profile = workflowProfiles["property-insurance-claim"];

const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A property insurance claim letter formally documents your position when your insurer has denied your claim, underpaid it, delayed response, disputed the scope of damage, or when you need to file a supplemental claim for additional damage. The letter creates a clear factual record — identifying the property, the policy, the claim, the damage, the insurer's position, and the requested resolution — which may be critical if the matter escalates to appraisal, a department of insurance complaint, or legal proceedings." },
  { icon: CheckCircle2, title: "When to use this workflow", items: [
    "Your claim was denied and you believe the denial is incorrect",
    "The insurer paid less than the estimated repair cost (underpayment)",
    "The insurer is delaying response or investigation without explanation",
    "The insurer disputes the scope or valuation of damage",
    "You discovered additional damage after the initial claim was filed",
    "You need to request a supplemental claim or additional inspection",
    "The insurer requested information and you need to respond formally",
    "You need to document the claim process before escalating",
  ]},
  { icon: AlertTriangle, title: "When not to use this workflow", items: [
    "You need immediate emergency repairs to prevent ongoing damage — mitigate first, document second",
    "You are facing a lawsuit from or against the insurer — consult an attorney immediately",
    "The claim involves bodily injury or liability — seek legal representation",
    "You want to file a complaint with your state department of insurance — that requires a separate formal process",
  ]},
  { icon: Scale, title: "Documents to gather", items: profile.evidenceRequirements },
  { icon: Calendar, title: "Deadlines and timing", content: "Insurance claim timelines are governed by your policy, state law, and the claim's procedural posture. Capture all dates from your policy, correspondence, and denial letters. Many policies require proof of loss within a specific timeframe. State laws may impose response deadlines on insurers. Do not assume a specific deadline — surface the date facts for your review and consult an attorney if you are unsure about limitation periods or proof-of-loss requirements." },
  { icon: ShieldCheck, title: "Evidence checklist", items: [
    "Your insurance policy or declarations page",
    "The claim number and all correspondence with the insurer",
    "The denial letter or explanation of benefits (if denied)",
    "Payment statements showing what was paid vs. claimed",
    "Photos of the property damage from multiple angles",
    "Repair estimates or contractor bids for the work",
    "Inspection reports, engineer reports, or adjuster notes",
    "Receipts for emergency repairs or temporary mitigation",
    "Any prior claim-related communications",
  ]},
  { icon: Eye, title: "How the workflow works", items: [
    "Intake: Provide property details, policy information, claim number, and describe the damage and insurer's position",
    "Documents: Upload or paste policy documents, denial letters, estimates, and correspondence",
    "Analysis: The system identifies facts, missing information, contradictions, and risks",
    "Evidence: Organize supporting documents and link them to factual assertions",
    "Timeline: Build a chronology from the dates in your materials — date of loss, report date, inspection, denial, etc.",
    "Draft: A professional claim letter is generated from your facts",
    "Review: You review and edit the draft before anything is sent",
    "Approval: You explicitly approve the draft before mailing",
    "Delivery: Certified mail with tracking and proof of delivery",
    "Proof: Permanent record of mailing, delivery, and correspondence",
  ]},
  { icon: AlertTriangle, title: "Common mistakes", items: [
    "Missing proof-of-loss deadlines specified in the policy",
    "Accepting the insurer's first estimate without getting your own",
    "Not documenting damage with photos before repairs",
    "Failing to mitigate further damage after the loss",
    "Not keeping copies of all correspondence with the insurer",
    "Sending communications without proof of delivery",
    "Assuming the insurer's scope assessment is definitive without independent verification",
  ]},
  { icon: Mail, title: "Mailing, tracking, and proof", content: "Your final letter is printed, enveloped, and mailed via USPS. Certified mail with return receipt provides signature tracking and proof of delivery — your permanent record that the insurer received your claim correspondence. This documentation may be critical if the matter escalates to appraisal, a department of insurance complaint, or legal proceedings." },
];

const intakeFields: IntakeField[] = [
  { key: "propertyAddress", label: "Property address *", placeholder: "123 Main Street, Springfield, IL 62701" },
  { key: "insurerName", label: "Insurance company name *", placeholder: "ABC Insurance Company" },
  { key: "claimNumber", label: "Claim number *", placeholder: "CLM-2026-001234" },
  { key: "dateOfLoss", label: "Date of loss *", placeholder: "March 15, 2026" },
  { key: "descriptionOfDamage", label: "Description of damage *", placeholder: "Describe the property damage — affected areas, type of damage, extent of damage...", type: "textarea", rows: 4 },
  { key: "insurerPosition", label: "Insurer's position (denial, underpayment, delay, dispute, etc.) *", placeholder: "Denied claim citing wear and tear exclusion. / Paid $5,000 but estimate is $15,000. / No response in 45 days...", type: "textarea", rows: 3 },
];
