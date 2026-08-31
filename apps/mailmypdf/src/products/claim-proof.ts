/**
 * ClaimProof — product definition
 *
 * Organize and mail claim documentation packages. Users compile
 * evidence for insurance claims, warranty claims, government benefits
 * claims, and similar — AI generates a cover letter, they review,
 * and MailMyPDF handles mailing + proof of delivery.
 */

export const claimProofProduct = {
  id: "claim-proof",
  name: "ClaimProof",
  tagline: "Your claim, organized and proven.",
  description:
    "Compile your claim documents, organize evidence, generate a professional cover letter, and mail a complete claim package — tracked and verified with proof of delivery.",
  claimTypes: [
    "Insurance claim",
    "Warranty / product claim",
    "Government benefits claim",
    "Property damage claim",
    "Small claims court filing",
    "Tax dispute / refund claim",
    "Contract / vendor dispute claim",
    "Other claim",
  ],
} as const;

export type ClaimProofType = (typeof claimProofProduct.claimTypes)[number];

export type ClaimProofInput = {
  claimType: string;
  recipientName: string;
  recipientAddress: string;
  claimNumber: string;
  claimDate: string;
  claimAmount: string;
  claimSummary: string;
  evidenceItems: string;
  deadline: string;
  claimantName: string;
  claimantAddress: string;
  claimantEmail: string;
  claimantPhone: string;
  documentText: string;
  additionalNotes: string;
};

export type ClaimProofAnalysis = {
  suggestedFormat: string | null;
  deadlineInfo: string | null;
  deadlinePassed: boolean;
  warnings: string[];
  tips: string[];
  checklistItems: string[];
};
