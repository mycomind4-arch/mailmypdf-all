import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { WorkflowAuthorityPage, type AuthoritySection } from "@/components/workflow-authority-page";


export const Route = createFileRoute("/workflows/debt-validation-dispute")({
  head: () => ({
    meta: [
      { title: "Debt Validation Dispute Letter — Request Proof, Stop Collection & Prove Delivery | Private Office" },
      { name: "description", content: "Prepare a professional debt validation dispute letter under the FDCPA. Request debt verification, dispute unauthorized collection, document incorrect amounts or wrong-party claims, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Debt Validation Dispute Letter — Private Office" },
      { property: "og:description", content: "Document your debt validation dispute with collection notices, credit records, and correspondence. Certified mail with proof of delivery under FDCPA 15 U.S.C. § 1692g." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="debt-validation-dispute" authoritySections={authoritySections} showWorkspace={false} />,
});


const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A debt validation dispute letter formally requests that a debt collector verify the existence, amount, and legal ownership of a debt they are attempting to collect. Under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g, a debt collector must send you a validation notice within five days of their initial communication, and you have the right to dispute the debt or request validation within 30 days of receiving that notice. If you dispute the debt in writing within that period, the collector must cease collection activities until they obtain and mail you verification of the debt. The letter creates a clear factual record, identifies the collector, the alleged debt, the basis for your dispute, and the evidence — all of which may be critical if the matter escalates to a complaint with the CFPB, FTC, or a legal proceeding." },
  { icon: CheckCircle2, title: "When to use this workflow", content: "Use this workflow when you have received a collection notice for a debt you do not recognize, a debt you believe is incorrect in amount or ownership, a debt that may be time-barred beyond the statute of limitations, or when a debt collector has failed to provide required validation information. This workflow helps you organize your collection notices, credit reports, payment records, and correspondence into a professional validation dispute letter." },
  { icon: ShieldCheck, title: "What Private Office does", content: "Private Office helps you prepare a documented debt validation dispute letter, organize your evidence (collection notices, credit report entries, payment records, prior correspondence), build a timeline, review the draft, and mail it via certified mail with proof of delivery. Private Office is not a law firm and does not provide legal advice or representation." },
  { icon: AlertTriangle, title: "What Private Office does NOT do", content: "Private Office does not determine whether a debt is legally valid, time-barred, or subject to specific FDCPA violations, provide legal advice, represent you in court or before a regulator, or guarantee any outcome including debt dismissal, cessation of collection, or removal from credit reports. You remain responsible for the facts and decisions in your matter." },
  { icon: Mail, title: "Certified mail with proof of delivery", content: "Your debt validation dispute letter is sent via certified mail with return receipt, providing proof that your correspondence was delivered. This creates an auditable trail that the collector received your dispute within the applicable period, which may be important if the matter escalates to a regulatory complaint or legal proceeding." },
];
