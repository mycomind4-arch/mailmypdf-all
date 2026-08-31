import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { WorkflowAuthorityPage, type AuthoritySection } from "@/components/workflow-authority-page";


export const Route = createFileRoute("/workflows/security-deposit-dispute")({
  head: () => ({
    meta: [
      { title: "Security Deposit Dispute Letter — Prepare, Review, Send & Prove | Private Office" },
      { name: "description", content: "Prepare a professional security deposit dispute letter for non-return, partial return, unauthorized deductions, or disputed damage charges. Organize lease evidence, condition reports, correspondence, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Security Deposit Dispute Letter — Private Office" },
      { property: "og:description", content: "Document your security deposit dispute with lease evidence, move-in/move-out condition reports, and professional correspondence. Certified mail with proof of delivery." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="security-deposit-dispute" authoritySections={authoritySections} showWorkspace={false} />,
});


const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A security deposit dispute letter formally documents your position when a landlord or property manager has not returned your deposit, returned only part of it with disputed deductions, or charged for damage you did not cause. The letter creates a clear factual record, identifies the lease terms, states the deposit amount and disputed charges, and requests a documented resolution — all of which may be critical if the matter escalates to a demand letter or legal proceeding." },
  { icon: CheckCircle2, title: "When to use this workflow", content: "Use this workflow when your security deposit has not been returned within the expected timeframe, when deductions appear unauthorized or undocumented, when the landlord has not provided an itemized statement, or when you dispute the damage charges. This workflow helps you organize your lease, condition reports, and correspondence into a professional dispute letter." },
  { icon: ShieldCheck, title: "What Private Office does", content: "Private Office helps you prepare a documented dispute letter, organize your evidence (lease, move-in and move-out condition reports, photos, correspondence), build a timeline, review the draft, and mail it via certified mail with proof of delivery. Private Office is not a law firm and does not provide legal advice or representation." },
  { icon: AlertTriangle, title: "What Private Office does NOT do", content: "Private Office does not determine the lawful amount of your deposit, interpret lease provisions as legal conclusions, provide legal advice, represent you in landlord-tenant court, or guarantee any outcome including deposit return. You remain responsible for the facts and decisions in your matter." },
  { icon: Mail, title: "Certified mail with proof of delivery", content: "Your dispute letter is sent via certified mail with return receipt, providing proof that your correspondence was delivered. This creates an auditable trail that the recipient received your dispute, which may be important if the matter escalates." },
];
