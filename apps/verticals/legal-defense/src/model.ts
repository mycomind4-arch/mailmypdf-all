export const LEGAL_DEFENSE_VERTICAL = {
  id: "legal-defense",
  name: "Legal Defense",
  route: "/legal-defense",
  tagline: "Build the defense record before details disappear.",
  status: "beta",
} as const;

export const STOLEN_VEHICLE_WORKFLOW = {
  id: "wrongful-stolen-vehicle-arrest",
  title: "Wrongful Stolen-Vehicle Arrest + Search Defense",
  route: "/legal-defense/workflows/wrongful-stolen-vehicle-arrest",
  executionRoute: "/legal-defense/workflows/wrongful-stolen-vehicle-arrest/start",
  jurisdiction: "California",
  maturity: "executable",
} as const;

export const WORKFLOW_STEPS = [
  { id: "case", label: "Case & counsel", description: "Capture the court, charges, custody status, and urgent dates." },
  { id: "timeline", label: "Stop–arrest timeline", description: "Reconstruct what happened in order and when the search occurred." },
  { id: "purchase", label: "Purchase provenance", description: "Document the sale, payment, seller, VIN, keys, and transfer attempts." },
  { id: "police-basis", label: "Police basis", description: "Record what officers said they relied on and compare identifiers." },
  { id: "search", label: "Search & pipe", description: "Trace the search and independently examine the paraphernalia allegation." },
  { id: "evidence", label: "Evidence inventory", description: "Mark preserved purchase records, video, reports, and discovery needs." },
  { id: "seller", label: "Seller scenarios", description: "Identify the ownership-chain explanation supported by the record." },
  { id: "review", label: "Issue review", description: "Surface contradictions, gaps, and counsel-review questions." },
  { id: "packet", label: "Defense packet", description: "Generate and download the attorney-ready intelligence packet." },
] as const;

export type StepId = (typeof WORKFLOW_STEPS)[number]["id"];
export type YesNoUnknown = "yes" | "no" | "unknown";
export type CustodyStatus = "released" | "in-custody" | "unknown";
export type SellerScenario = "legitimate-sale" | "authority-to-sell" | "broken-title-chain" | "fraudulent-seller" | "upstream-theft" | "post-sale-report" | "unknown";

export type DefenseCaseInput = {
  defendantName: string;
  state: string;
  county: string;
  court: string;
  caseNumber: string;
  arrestDate: string;
  nextCourtDate: string;
  custodyStatus: CustodyStatus;
  represented: YesNoUnknown;
  attorneyName: string;
  chargedOffenses: string;
  stopReason: string;
  stopLocation: string;
  officerReasonGiven: string;
  vehicleHitAnnouncedAt: string;
  billOfSaleShownAt: string;
  handcuffedAt: string;
  arrestedAt: string;
  searchedAt: string;
  mirandaAt: string;
  statements: string;
  vehicleYearMakeModel: string;
  vehicleVin: string;
  vehiclePlate: string;
  billOfSaleVin: string;
  reportVin: string;
  reportPlate: string;
  purchaseDate: string;
  purchasePrice: string;
  sellerName: string;
  sellerContact: string;
  sellerIdKnown: YesNoUnknown;
  keysProvided: YesNoUnknown;
  titleProvided: YesNoUnknown;
  paymentTrace: YesNoUnknown;
  transferAttempted: YesNoUnknown;
  alteredVinOrIgnition: YesNoUnknown;
  activeHitKnown: YesNoUnknown;
  dispatchConfirmed: YesNoUnknown;
  officersReviewedBillOfSale: YesNoUnknown;
  bodycamKnown: YesNoUnknown;
  searchType: string;
  itemLocation: string;
  itemDescription: string;
  itemBelongsToDefendant: YesNoUnknown;
  residueTested: YesNoUnknown;
  itemPhotographed: YesNoUnknown;
  evidenceChainKnown: YesNoUnknown;
  sellerScenario: SellerScenario;
  scenarioNotes: string;
  notes: string;
  evidence: string[];
};

export const EMPTY_DEFENSE_CASE: DefenseCaseInput = {
  defendantName: "", state: "California", county: "", court: "", caseNumber: "", arrestDate: "", nextCourtDate: "", custodyStatus: "unknown", represented: "unknown", attorneyName: "", chargedOffenses: "",
  stopReason: "", stopLocation: "", officerReasonGiven: "", vehicleHitAnnouncedAt: "", billOfSaleShownAt: "", handcuffedAt: "", arrestedAt: "", searchedAt: "", mirandaAt: "", statements: "",
  vehicleYearMakeModel: "", vehicleVin: "", vehiclePlate: "", billOfSaleVin: "", reportVin: "", reportPlate: "", purchaseDate: "", purchasePrice: "", sellerName: "", sellerContact: "", sellerIdKnown: "unknown", keysProvided: "unknown", titleProvided: "unknown", paymentTrace: "unknown", transferAttempted: "unknown", alteredVinOrIgnition: "unknown",
  activeHitKnown: "unknown", dispatchConfirmed: "unknown", officersReviewedBillOfSale: "unknown", bodycamKnown: "unknown", searchType: "Search after arrest", itemLocation: "Pocket", itemDescription: "", itemBelongsToDefendant: "unknown", residueTested: "unknown", itemPhotographed: "unknown", evidenceChainKnown: "unknown",
  sellerScenario: "unknown", scenarioNotes: "", notes: "", evidence: [],
};

export const EVIDENCE_ITEMS = [
  "Original bill of sale", "Title or pink slip", "Marketplace advertisement", "Seller text messages", "Seller emails", "Payment record", "Purchase photographs", "Keys provided by seller", "Smog or registration paperwork", "DMV transfer attempt", "Stolen-vehicle report", "CLETS/NCIC return", "CAD/dispatch record", "Dispatch audio", "Body-camera video", "Dash-camera video", "ALPR hit record", "Tow sheet", "Impound inventory", "Officer notes and reports", "Vehicle/VIN photographs", "Property/evidence log", "Paraphernalia photograph", "Residue or laboratory report",
] as const;
