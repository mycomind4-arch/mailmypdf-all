/**
 * BenefitsAppeal — product definition
 *
 * Appeal denials of government benefits: Social Security disability,
 * unemployment, SNAP/food assistance, Medicaid, veterans benefits,
 * housing assistance, and more. AI drafts a formal appeal letter,
 * they review, and MailMyPDF mails it certified before the deadline.
 */

export const benefitsAppealProduct = {
  id: "benefits-appeal",
  name: "BenefitsAppeal",
  tagline: "Appeal a benefits denial. Before the deadline.",
  description:
    "Denied benefits? Draft a formal appeal letter, organize supporting evidence, and mail it certified with proof of delivery.",
  benefitTypes: [
    "Social Security disability (SSDI/SSI)",
    "Unemployment benefits",
    "SNAP / food assistance",
    "Medicaid / health coverage",
    "Veterans benefits (VA)",
    "Housing assistance / Section 8",
    "Workers compensation",
    "TANF / cash assistance",
    "Medicare coverage",
    "Other benefits denial",
  ],
} as const;

export type BenefitsAppealType = (typeof benefitsAppealProduct.benefitTypes)[number];

export type BenefitsAppealInput = {
  benefitType: string;
  agencyName: string;
  agencyAddress: string;
  caseNumber: string;
  denialDate: string;
  appealDeadline: string;
  denialReason: string;
  appellantPosition: string;
  evidenceItems: string;
  appellantName: string;
  appellantAddress: string;
  appellantEmail: string;
  appellantPhone: string;
  documentText: string;
  additionalNotes: string;
};

export type BenefitsAppealAnalysis = {
  suggestedAction: string | null;
  deadlineInfo: string | null;
  deadlinePassed: boolean;
  daysRemaining: number | null;
  warnings: string[];
  tips: string[];
  checklistItems: string[];
  appealLevel: string | null;
};
