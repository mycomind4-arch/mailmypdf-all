import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from "lucide-react";
import {
  WorkflowAuthorityPage,
  type AuthoritySection,
  type IntakeField,
} from "@/components/workflow-authority-page";

export const Route = createFileRoute("/workflows/debt-validation-dispute")({
  head: () => ({
    meta: [
      {
        title:
          "Debt Validation Dispute Letter — Request Verification & Document Delivery | Private Office",
      },
      {
        name: "description",
        content:
          "Prepare a documented debt validation dispute letter, organize collection notices and supporting records, review the draft, and mail it with delivery proof.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Debt Validation Dispute Letter — Private Office" },
      {
        property: "og:description",
        content:
          "Organize a debt validation dispute using collection notices, credit records, payment history, chronology, human review, and proof of delivery.",
      },
    ],
  }),
  component: () => (
    <WorkflowAuthorityPage
      workflowId="debt-validation-dispute"
      authoritySections={authoritySections}
      intakeFields={intakeFields}
    />
  ),
});

const intakeFields: IntakeField[] = [
  {
    key: "collector",
    label: "Debt collector",
    placeholder: "Collector or collection agency name",
  },
  {
    key: "accountReference",
    label: "Account or reference number",
    placeholder: "Use only the reference shown in the collector's correspondence",
  },
  {
    key: "allegedAmount",
    label: "Alleged amount",
    placeholder: "Amount stated by the collector",
  },
  {
    key: "originalCreditor",
    label: "Original creditor",
    placeholder: "Original creditor if identified",
  },
  {
    key: "noticeDate",
    label: "Collection notice date",
    placeholder: "Date shown on the notice",
  },
  {
    key: "disputeBasis",
    label: "What do you dispute?",
    placeholder:
      "Describe what is incorrect or unknown without adding facts you cannot support.",
    type: "textarea",
    rows: 4,
  },
];

const authoritySections: AuthoritySection[] = [
  {
    icon: FileText,
    title: "Overview",
    content:
      "A debt validation dispute creates a written record of what a collector is claiming, what information you dispute or need verified, the dates shown in the collector's communications, and the documents supporting your position. Private Office keeps source facts, assumptions, requested verification, and the final correspondence separate so the user can review them before anything is mailed.",
  },
  {
    icon: CheckCircle2,
    title: "When to use this workflow",
    content:
      "Use this workflow when you received collection correspondence and need to request verification, dispute an amount or identity, document that you do not recognize the debt, preserve a chronology, or respond to a collector with a controlled written record. Deadline treatment depends on the actual notice, dates, debt type, and jurisdiction; the workflow surfaces those facts rather than inventing a deadline.",
  },
  {
    icon: ShieldCheck,
    title: "What Private Office does",
    content:
      "Private Office organizes collection notices, credit records, payment records, and correspondence; extracts supported facts and dates; identifies missing information; prepares a draft for human review; and routes the approved correspondence through MailMyPDF fulfillment with delivery proof.",
  },
  {
    icon: AlertTriangle,
    title: "What Private Office does not do",
    content:
      "Private Office does not decide whether a debt is legally valid, determine a statute of limitations, declare that a collector violated a law, provide legal representation, or guarantee deletion, dismissal, cessation of collection, or any other result. Potential legal or deadline issues are surfaced for verification rather than stated as conclusions.",
  },
  {
    icon: Mail,
    title: "Mailing and proof",
    content:
      "After the exact draft and recipient are reviewed and authorized, MailMyPDF can send the approved packet using the selected mailing service and retain the fulfillment and delivery record. Payment alone never substitutes for the approval and integrity gates.",
  },
];
