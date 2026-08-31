/**
 * Maps workflow IDs to their hero background image.
 * Images use a "private office" aesthetic — professional, warm, authoritative.
 */

const IMG = (slug: string) =>
  `https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/${slug}_generated_image.png`;

// Category-level images
const INSURANCE = IMG("622b86edc");
const MEDICAL = IMG("c808e753b");
const SOCIAL_SECURITY = IMG("eb702f657");
const GOVERNMENT = IMG("348a016b8");
const DMV = IMG("38a946d04");
const FINANCIAL_AID = IMG("f07881066");
const EMPLOYMENT = IMG("324270c8f");
const LEGAL = IMG("f55dbb8cd");

export const HOMEPAGE_HERO_IMAGE = IMG("a99daa8e1");

export const WORKFLOW_HERO_IMAGES: Record<string, string> = {
  // Insurance (general)
  "insurance-claim-denial": INSURANCE,
  "insurance-denial-letter": INSURANCE,
  "insurance-coverage-denial": INSURANCE,
  "claim-denial-letter": INSURANCE,
  "car-insurance-appeal": INSURANCE,
  "life-insurance-denial": INSURANCE,
  "denied-claim": INSURANCE,
  "denied-claim-ai": INSURANCE,

  // Medical / Health insurance
  "medical-insurance-denial": MEDICAL,
  "medical-necessity-appeal": MEDICAL,
  "prior-authorization-denial": MEDICAL,
  "out-of-network-denial": MEDICAL,
  "dental-insurance-appeal": MEDICAL,

  // Social Security / Disability
  "ssdi-denial": SOCIAL_SECURITY,
  "ssdi-appeal": SOCIAL_SECURITY,
  "ssi-denial": SOCIAL_SECURITY,
  "social-security-denial": SOCIAL_SECURITY,
  "reconsideration": SOCIAL_SECURITY,

  // Government / Administrative
  "government-decision": GOVERNMENT,
  "administrative-decision": GOVERNMENT,
  "administrative-decision-appeal": GOVERNMENT,
  "medicaid-denial": GOVERNMENT,

  // DMV / Licensing
  "license-suspension-appeal": DMV,
  "drivers-license-suspension": DMV,
  "license-revocation-appeal": DMV,
  "dmv-suspension-appeal": DMV,
  "registration-suspension-appeal": DMV,

  // Financial Aid
  "financial-aid-appeal": FINANCIAL_AID,
  "sap-appeal": FINANCIAL_AID,
  "financial-aid-suspension-appeal": FINANCIAL_AID,
  "financial-aid-reinstatement": FINANCIAL_AID,
  "financial-aid-special-circumstances": FINANCIAL_AID,
  "scholarship-appeal": FINANCIAL_AID,
  "fafsa-appeal": FINANCIAL_AID,

  // Employment / Unemployment
  "unemployment-denial": EMPLOYMENT,
  "edd-denial": EMPLOYMENT,

  // Legal / Court
  "court-ruling": LEGAL,
};

export function getWorkflowHeroImage(workflowId: string): string | undefined {
  return WORKFLOW_HERO_IMAGES[workflowId];
}
