export const SSDI_APPEAL_AUTHORITY_SOURCES = [
  { title: "SSA — Appeal a decision we made", url: "https://www.ssa.gov/apply/appeal-decision-we-made", purpose: "Current appeal-level overview and official pathway." },
  { title: "SSA — Request reconsideration", url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-reconsideration", purpose: "Current reconsideration instructions and deadline." },
  { title: "SSA — Form SSA-561", url: "https://www.ssa.gov/forms/ssa-561.html", purpose: "Official reconsideration form and submission information." },
  { title: "SSA — Form SSA-3441", url: "https://www.ssa.gov/forms/ssa-3441.html", purpose: "Official disability appeal report and supporting-form guidance." },
  { title: "SSA — Request hearing with a judge", url: "https://www.ssa.gov/apply/appeal-decision-we-made/request-hearing", purpose: "Current hearing pathway and deadline." },
] as const;

export const SSDI_APPEAL_AUTHORITY_RULES = [
  "Verify the notice and current SSA source before relying on a procedural claim.",
  "Distinguish medical and non-medical appeal pathways.",
  "Treat the 60-day period as source-backed SSA guidance, not a generic administrative convention.",
  "Surface possible good-cause/late-filing issues instead of rejecting them without analysis.",
  "Never invent medical or vocational evidence.",
] as const;
