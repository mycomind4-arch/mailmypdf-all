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

export const Route = createFileRoute("/workflows/bank-wire-dispute")({
  head: () => ({
    meta: [
      { title: "Bank & Wire Transfer Dispute Letter — Document & Dispute | Private Office" },
      { name: "description", content: "Prepare a documented bank or wire transfer dispute letter for unauthorized wires, mistaken transfers, beneficiary errors, bank refusals, or delayed investigations. Organize transaction records, build a chronology, review the draft, and send certified mail with proof of delivery." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Bank & Wire Transfer Dispute Letter — Private Office" },
      { property: "og:description", content: "Document your bank or wire transfer dispute with transaction records, chronology, and professional correspondence. Certified mail with proof of delivery." },
    ],
  }),
  component: () => <WorkflowAuthorityPage workflowId="bank-wire-dispute" authoritySections={authoritySections} intakeFields={intakeFields} />,
});

const profile = workflowProfiles["bank-wire-dispute"];

const authoritySections: AuthoritySection[] = [
  { icon: FileText, title: "Overview", content: "A bank and wire transfer dispute letter formally documents your position when a wire transfer or bank transaction has been disputed — an unauthorized wire, mistaken transfer, beneficiary or account error, bank refusal to investigate, delayed response, or disputed transaction. The letter creates a clear factual record — identifying the financial institution, the account holder, the reported transaction, the dispute, the bank's response, and the requested resolution — which may be critical if the matter escalates to a regulatory complaint, fraud claim, or legal proceedings. Private Office does not determine whether a transaction was legally unauthorized and does not guarantee any outcome including recovery." },
  { icon: CheckCircle2, title: "When to use this workflow", items: [
    "A wire transfer was sent or received that you believe was unauthorized",
    "A transfer was sent to the wrong beneficiary or account",
    "The bank refused to recall or investigate a disputed transfer",
    "The bank is delaying investigation without explanation",
    "You need to formally document a disputed transaction",
    "You need to request a recall, correction, or reimbursement",
    "You need to submit additional documentation to the bank",
    "You need to request a status update or written explanation",
    "You need to document the dispute before escalating to a regulator",
  ]},
  { icon: AlertTriangle, title: "When not to use this workflow", items: [
    "You need to report active fraud to law enforcement — contact your bank and file a police report immediately",
    "You need to file a complaint with a regulator (CFPB, OCC, state banking authority) — that requires a separate formal process",
    "You are facing a lawsuit — consult an attorney immediately",
    "You need to freeze accounts or stop payment — contact your bank directly and immediately",
    "The transaction involves suspected money laundering or terrorism financing — report to the appropriate authorities",
  ]},
  { icon: Lock, title: "Privacy and data minimization", content: "This workflow involves sensitive financial information. Do not provide full bank account numbers, passwords, PINs, or online banking credentials. Where an account reference is useful, use masked values such as 'Account ending 4821' rather than the full account number. Private Office never asks for or stores authentication credentials. Only provide factual information relevant to documenting the dispute." },
  { icon: Scale, title: "Documents to gather", items: profile.evidenceRequirements },
  { icon: Calendar, title: "Deadlines and timing", content: "Financial transaction dispute timelines vary by transaction type, institution, jurisdiction, account type, applicable agreement, and whether the transaction is classified as unauthorized or fraudulent. Capture all dates from your bank statements, correspondence, and account agreements. Some banks have stated response timeframes for disputes. Federal regulations may impose investigation deadlines on banks for certain transaction types. Do not assume a specific deadline — surface the date facts for your review and consult your bank's dispute policy or an attorney if you are unsure about limitation periods or regulatory deadlines." },
  { icon: ShieldCheck, title: "Evidence checklist", items: [
    "Bank statement showing the disputed transaction",
    "Wire transfer confirmation, receipt, or SWIFT message",
    "Transaction confirmation or transfer record",
    "All bank correspondence regarding the dispute",
    "Any dispute or recall request you previously submitted",
    "Bank investigation response or status update",
    "Beneficiary or recipient information (if known)",
    "Relevant invoices, contracts, or agreements",
    "Supporting communications — email, chat, or phone logs",
  ]},
  { icon: Eye, title: "How the workflow works", items: [
    "Intake: Provide the financial institution, account holder name, transaction details, and describe the dispute and bank's response",
    "Documents: Upload or paste bank statements, transfer confirmations, and correspondence",
    "Analysis: The system identifies facts, missing information, contradictions, and risks",
    "Evidence: Organize supporting documents and link them to factual assertions",
    "Timeline: Build a chronology from the dates in your materials — transaction date, discovery date, notification date, bank response, etc.",
    "Draft: A professional dispute letter is generated from your facts",
    "Review: You review and edit the draft before anything is sent",
    "Approval: You explicitly approve the draft before mailing",
    "Delivery: Certified mail with tracking and proof of delivery",
    "Proof: Permanent record of mailing, delivery, and correspondence",
  ]},
  { icon: AlertTriangle, title: "Common mistakes", items: [
    "Not notifying the bank promptly after discovering the issue",
    "Not keeping copies of all correspondence with the bank",
    "Failing to document the dispute in writing (phone calls alone are not sufficient)",
    "Not preserving transaction confirmations and receipts",
    "Sending communications without proof of delivery",
    "Assuming the bank's initial response is final without formal follow-up",
    "Not documenting the chronology of events",
    "Providing full account numbers when masked references would suffice",
  ]},
  { icon: Mail, title: "Mailing, tracking, and proof", content: "Your final letter is printed, enveloped, and mailed via USPS. Certified mail with return receipt provides signature tracking and proof of delivery — your permanent record that the financial institution received your dispute correspondence. This documentation may be critical if the matter escalates to a regulatory complaint, fraud claim, or legal proceedings." },
];

const intakeFields: IntakeField[] = [
  { key: "financialInstitution", label: "Financial institution (bank, credit union, etc.) *", placeholder: "First National Bank" },
  { key: "accountHolderName", label: "Account holder name *", placeholder: "Jane Q. Public" },
  { key: "accountReference", label: "Account reference (masked — e.g., \"Account ending 4821\")", placeholder: "Account ending 4821", note: "Use masked references only. Do not enter full account numbers." },
  { key: "transactionDate", label: "Transaction date *", placeholder: "March 10, 2026" },
  { key: "transactionAmount", label: "Transaction amount and currency *", placeholder: "$25,000.00 USD" },
  { key: "transactionType", label: "Transaction type", placeholder: "Domestic wire / International wire / ACH transfer / Other" },
  { key: "referenceNumber", label: "Reference or confirmation number (if available)", placeholder: "WTR-2026-0310-8842" },
  { key: "reportedBeneficiary", label: "Reported beneficiary or destination (if known)", placeholder: "John Doe / XYZ Corp / Account at Second National Bank" },
  { key: "disputeDescription", label: "Describe the dispute *", placeholder: "Describe why the transaction is disputed — unauthorized wire, mistaken transfer, beneficiary error, bank refusal, delayed investigation, disputed transaction...", type: "textarea", rows: 4 },
  { key: "discoveryDate", label: "When did you discover the issue?", placeholder: "March 12, 2026" },
  { key: "notificationDate", label: "When did you notify the bank?", placeholder: "March 13, 2026" },
  { key: "bankResponse", label: "Bank's response or current status *", placeholder: "Bank denied recall request. / Investigation opened, no update in 30 days. / Bank claims transaction was authorized. / No response received...", type: "textarea", rows: 3 },
];
