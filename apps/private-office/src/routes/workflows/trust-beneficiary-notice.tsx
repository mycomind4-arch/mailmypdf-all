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
  Lock,
} from "lucide-react";
import { WorkflowAuthorityPage, type AuthoritySection, type IntakeField } from "@/components/workflow-authority-page";
import { workflowProfiles } from "@/domain/workflow-profiles";

export const Route = createFileRoute("/workflows/trust-beneficiary-notice")({
  head: () => ({
    meta: [
      { title: "Trust Beneficiary Notice & Correspondence — Document & Request | Private Office" },
      { name: "description", content: "Prepare a documented trust beneficiary notice or correspondence — request trust information, accounting, distribution status, or clarification from the trustee. Organize evidence, build a chronology, review the draft, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Trust Beneficiary Notice — Private Office" },
      { property: "og:description", content: "Document your trust beneficiary matter with evidence, chronology, and professional correspondence to the trustee. Certified mail with proof of delivery." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="trust-beneficiary-notice" authoritySections={authoritySections} intakeFields={intakeFields} />,
});

const profile = workflowProfiles["trust-beneficiary-notice"];

const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A trust beneficiary notice or correspondence formally documents your position as a beneficiary of a trust — whether you are requesting information, an accounting, distribution status, clarification of trust provisions, or submitting documentation to the trustee. The letter creates a clear factual record — identifying the trust, the trustee, the beneficiary, the matter, the trustee's position, and the requested resolution — which may be critical if the matter escalates to court proceedings or professional legal review. Private Office does not determine beneficiary status, interpret trust instruments as legal conclusions, determine whether a trustee has violated fiduciary duties, or guarantee any outcome including inheritance or distribution." },
  { icon: CheckCircle2, title: "When to use this workflow", items: [
    "You need to formally request trust information or documents from the trustee",
    "You are requesting an accounting of trust assets, income, or distributions",
    "You need to inquire about the status of a distribution",
    "You need to request clarification about trust provisions or your beneficiary status",
    "You need to respond to a trustee communication formally",
    "You need to submit documentation requested by the trustee",
    "You need to provide formal written notice as a beneficiary",
    "You need to document the matter before seeking professional legal review",
  ]},
  { icon: AlertTriangle, title: "When not to use this workflow", items: [
    "You need to initiate litigation against a trustee — consult a trust litigation attorney immediately",
    "You need to remove a trustee or petition the court — that requires formal legal proceedings",
    "You need to interpret complex trust provisions — consult a trust attorney",
    "You need to determine whether you are legally a beneficiary — consult a trust attorney",
    "You need to challenge the validity of the trust itself — that requires formal legal proceedings",
    "You suspect fiduciary breach and need immediate legal action — consult an attorney",
  ]},
  { icon: Lock, title: "Privacy and document sensitivity", content: "Trust documents may contain extremely sensitive personal and financial information — names, family relationships, asset details, and estate planning information. Provide only the information necessary for documenting your matter. Do not provide Social Security numbers, full bank account numbers, passwords, financial login credentials, or unnecessary tax identifiers. Where account references are relevant, use masked identifiers such as 'Account ending 4821.' Private Office never asks for or stores authentication credentials." },
  { icon: Scale, title: "Documents to gather", items: profile.evidenceRequirements },
  { icon: Calendar, title: "Deadlines and timing", content: "Trust and beneficiary deadlines depend on jurisdiction, trust language, event type, applicable statute, notice date, trustee action, and court involvement. Capture all dates from your trust documents, trustee correspondence, and court filings. Some trusts specify response timeframes or notice periods. State trust codes may impose deadlines for accounting, contesting actions, or bringing claims. Do not assume a specific deadline — surface the date facts for your review and consult the applicable trust documents or a trust attorney if you are unsure about limitation periods or trust-code deadlines." },
  { icon: ShieldCheck, title: "Evidence checklist", items: [
    "The trust instrument or trust document",
    "Any amendments or restatements of the trust",
    "All correspondence from the trustee",
    "Any prior beneficiary notices or communications you have sent",
    "Accounting records or financial statements for the trust",
    "Distribution records or receipts",
    "Inventory or asset documentation",
    "Court documents, orders, or filings (if applicable)",
    "Death certificate (if relevant to the matter)",
    "Supporting communications — email, letters, or phone logs",
  ]},
  { icon: Eye, title: "How the workflow works", items: [
    "Intake: Provide the trust name, trustee name, your name as beneficiary, and describe the matter and trustee's position",
    "Documents: Upload or paste trust documents, correspondence, and records",
    "Analysis: The system identifies facts, missing information, contradictions, and risks — without drawing legal conclusions",
    "Evidence: Organize supporting documents and link them to factual assertions",
    "Timeline: Build a chronology from the dates in your materials — trust creation, amendments, trustee communications, etc.",
    "Draft: A professional beneficiary correspondence is generated from your facts",
    "Review: You review and edit the draft before anything is sent",
    "Approval: You explicitly approve the draft before mailing",
    "Delivery: Certified mail with tracking and proof of delivery",
    "Proof: Permanent record of mailing, delivery, and correspondence",
  ]},
  { icon: AlertTriangle, title: "Important limitations", content: "Private Office is a documentation and correspondence workflow, not a legal decision-maker. It does not determine who is legally a beneficiary, whether a trustee has violated fiduciary duties, or what trust language means as a legal conclusion. If document language and your understanding appear inconsistent, the workflow will flag this for your review and recommend obtaining professional advice. Always consult a qualified trust attorney for legal conclusions about your rights, the trustee's obligations, or the meaning of trust provisions." },
  { icon: Mail, title: "Mailing, tracking, and proof", content: "Your final letter is printed, enveloped, and mailed via USPS. Certified mail with return receipt provides signature tracking and proof of delivery — your permanent record that the trustee received your beneficiary correspondence. This documentation may be critical if the matter escalates to court proceedings, professional legal review, or formal proceedings." },
];

const intakeFields: IntakeField[] = [
  { key: "trustName", label: "Trust name or identifier *", placeholder: "The Smith Family Trust dated January 15, 2020" },
  { key: "trusteeName", label: "Trustee name *", placeholder: "John A. Smith" },
  { key: "beneficiaryName", label: "Your name (beneficiary) *", placeholder: "Jane B. Smith" },
  { key: "beneficiaryStatus", label: "Your relationship/status as reported", placeholder: "Named beneficiary in Section 3.2 of the trust instrument", note: "Report your status as stated in the trust document. Private Office does not verify or determine beneficiary status." },
  { key: "trustType", label: "Trust type (if known)", placeholder: "Revocable living trust / Irrevocable trust / Testamentary trust" },
  { key: "governingJurisdiction", label: "Governing jurisdiction (if known)", placeholder: "State of California" },
  { key: "relevantDate", label: "Relevant date (key event date) *", placeholder: "Date of settlor's passing, date of trustee's last communication, date of distribution request..." },
  { key: "matterDescription", label: "Describe the matter *", placeholder: "Describe what happened — requested information, trustee communication received, distribution inquiry, accounting request, documentation submission...", type: "textarea", rows: 4 },
  { key: "trusteePosition", label: "Trustee's current position or response *", placeholder: "Trustee has not responded to information request. / Trustee states distribution is pending. / Trustee provided partial accounting. / No response received...", type: "textarea", rows: 3 },
];
