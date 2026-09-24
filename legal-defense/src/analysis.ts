import type { DefenseCaseInput, SellerScenario, StepId } from "./model.js";

export type DefenseIssue = {
  id: string;
  title: string;
  status: "supported" | "open" | "conflict" | "urgent";
  summary: string;
  counselQuestion: string;
};

export type DependencyNode = {
  id: string;
  label: string;
  kind: "source" | "event" | "evidence";
  parentId: string | null;
  status: "documented" | "unverified" | "disputed";
};

const clean = (value: string) => value.trim();
const sameIdentifier = (a: string, b: string) => Boolean(clean(a) && clean(b) && clean(a).toUpperCase() === clean(b).toUpperCase());

export function validateStep(step: StepId, input: DefenseCaseInput): string[] {
  switch (step) {
    case "case": {
      const errors: string[] = [];
      if (!clean(input.defendantName)) errors.push("Enter the defendant's name.");
      if (!clean(input.state)) errors.push("Select the state.");
      if (!clean(input.arrestDate)) errors.push("Enter the arrest date.");
      if (!clean(input.chargedOffenses)) errors.push("List the filed or alleged charges, or state that they are not yet known.");
      return errors;
    }
    case "timeline":
      return [!clean(input.stopReason) && "Record the stated reason for the stop.", !clean(input.arrestedAt) && "Record when the arrest occurred or write ‘unknown’.", !clean(input.searchedAt) && "Record when the search occurred or write ‘unknown’."].filter(Boolean) as string[];
    case "purchase":
      return [!clean(input.vehicleVin) && "Enter the vehicle VIN or state that it is unavailable.", !clean(input.purchaseDate) && "Enter the purchase date.", !clean(input.sellerName) && "Enter the seller's name or the identifier used in the sale.", !input.evidence.includes("Original bill of sale") && "Confirm that the original bill of sale is preserved before continuing."].filter(Boolean) as string[];
    case "police-basis":
      return !clean(input.officerReasonGiven) ? ["Record what officers said supported the stolen-vehicle arrest."] : [];
    case "search":
      return [!clean(input.searchType) && "Describe the asserted basis for the search.", !clean(input.itemLocation) && "Record where the object was found.", !clean(input.itemDescription) && "Describe the object as specifically as the current record allows."].filter(Boolean) as string[];
    case "evidence":
      return input.evidence.length < 2 ? ["Preserve or identify at least two evidence items, including the bill of sale."] : [];
    case "seller":
      return input.sellerScenario === "unknown" && !clean(input.scenarioNotes) ? ["Choose the closest seller scenario or explain why it remains unknown."] : [];
    case "review":
    case "packet":
      return [];
  }
}

export function buildDependencyTree(input: DefenseCaseInput): DependencyNode[] {
  const hitStatus = input.activeHitKnown === "yes" ? "documented" : input.activeHitKnown === "no" ? "disputed" : "unverified";
  const arrestStatus = clean(input.arrestedAt) ? "documented" : "unverified";
  const searchStatus = clean(input.searchedAt) ? "documented" : "unverified";
  return [
    { id: "hit", label: "Alleged stolen-vehicle information", kind: "source", parentId: null, status: hitStatus },
    { id: "stop", label: "Traffic stop / detention", kind: "event", parentId: "hit", status: clean(input.stopReason) ? "documented" : "unverified" },
    { id: "arrest", label: "Vehicle-related arrest", kind: "event", parentId: "stop", status: arrestStatus },
    { id: "search", label: input.searchType || "Search of person", kind: "event", parentId: "arrest", status: searchStatus },
    { id: "pipe", label: input.itemDescription || "Alleged paraphernalia", kind: "evidence", parentId: "search", status: input.itemBelongsToDefendant === "no" ? "disputed" : input.itemDescription ? "documented" : "unverified" },
  ];
}

export function buildDefenseIssues(input: DefenseCaseInput): DefenseIssue[] {
  const issues: DefenseIssue[] = [];
  const vinConflict = clean(input.vehicleVin) && clean(input.reportVin) && !sameIdentifier(input.vehicleVin, input.reportVin);
  const saleVinConflict = clean(input.vehicleVin) && clean(input.billOfSaleVin) && !sameIdentifier(input.vehicleVin, input.billOfSaleVin);

  if (input.custodyStatus === "in-custody" || clean(input.nextCourtDate)) {
    issues.push({ id: "urgent-counsel", title: "Immediate counsel and deadline review", status: "urgent", summary: input.custodyStatus === "in-custody" ? "The defendant is reported in custody." : `A court date is recorded: ${input.nextCourtDate}.`, counselQuestion: "What must be preserved, requested, or filed before the next hearing?" });
  }
  issues.push({ id: "vehicle-intent", title: "Vehicle consent, intent, and knowledge", status: input.paymentTrace === "yes" && input.evidence.includes("Original bill of sale") ? "supported" : "open", summary: "A purchase record may bear on whether possession appeared to result from an ordinary sale, but it does not by itself prove the seller owned or could transfer the vehicle.", counselQuestion: "Which charged vehicle offense applies, and what evidence addresses each required mental-state and consent element?" });

  if (vinConflict || saleVinConflict) {
    issues.push({ id: "identifier-conflict", title: "Vehicle identifier mismatch", status: "conflict", summary: vinConflict ? "The entered vehicle VIN does not match the entered police-report VIN." : "The entered vehicle VIN does not match the entered bill-of-sale VIN.", counselQuestion: "Which VIN or plate did officers rely on before arrest, and can the source return be obtained?" });
  } else {
    issues.push({ id: "identifier-check", title: "Vehicle identifier comparison", status: input.reportVin ? "supported" : "open", summary: input.reportVin ? "The entered VIN values match; verify them against the source documents rather than relying on typed data." : "The stolen-report VIN or plate has not been entered.", counselQuestion: "Do the physical vehicle, bill of sale, DMV return, and stolen report identify the same vehicle?" });
  }

  issues.push({ id: "probable-cause", title: "Facts known at the moment of arrest", status: input.activeHitKnown === "no" || input.dispatchConfirmed === "no" ? "conflict" : "open", summary: "The later ownership outcome is not a substitute for reconstructing the facts reasonably available to officers when the arrest occurred.", counselQuestion: "What did each officer and dispatcher know before handcuffing and arrest, and what source supports that timeline?" });
  issues.push({ id: "search-link", title: "Search dependency and suppression issue", status: clean(input.arrestedAt) && clean(input.searchedAt) ? "supported" : "open", summary: "The alleged paraphernalia appears downstream of the vehicle arrest in the entered sequence. California Penal Code §1538.5 supplies a procedure for litigating search-and-seizure issues; counsel must determine whether any substantive ground exists.", counselQuestion: "Was the search justified as incident to arrest or on another basis, and what evidence would be affected by a successful challenge?" });
  issues.push({ id: "pipe-merits", title: "Independent paraphernalia proof", status: input.residueTested === "yes" && input.itemPhotographed === "yes" ? "supported" : "open", summary: "The object, possession, knowledge, testing, photography, packaging, statements, and chain of custody require separate review from the vehicle allegation.", counselQuestion: "What admissible evidence identifies the object, possession, knowledge, and intended use?" });
  if (input.state !== "California") {
    issues.push({ id: "jurisdiction", title: "Authority pack does not match jurisdiction", status: "urgent", summary: `The reviewed legal references in this workflow are California-specific, but the selected state is ${input.state}.`, counselQuestion: "Which statutes, court rules, discovery procedures, and suppression mechanisms apply in the selected jurisdiction?" });
  }
  return issues;
}

const SELLER_LABELS: Record<SellerScenario, string> = {
  "legitimate-sale": "Legitimate owner sold the vehicle; the report may be erroneous or outdated",
  "authority-to-sell": "Seller may have had authority to sell despite title paperwork problems",
  "broken-title-chain": "A prior transfer may have occurred without completed title registration",
  "fraudulent-seller": "Seller may have sold property without authority, making the buyer a possible fraud victim",
  "upstream-theft": "The vehicle may have been stolen before the seller acquired it",
  "post-sale-report": "A reporting party may have made or maintained a stolen report after a disputed transfer",
  unknown: "The seller/ownership scenario remains unresolved",
};

export function packetReadiness(input: DefenseCaseInput): { score: number; missing: string[] } {
  const checks = [
    [Boolean(clean(input.defendantName)), "Defendant identity"],
    [Boolean(clean(input.chargedOffenses)), "Exact charges"],
    [Boolean(clean(input.stopReason) && clean(input.arrestedAt) && clean(input.searchedAt)), "Stop–arrest–search sequence"],
    [Boolean(clean(input.vehicleVin)), "Vehicle VIN"],
    [input.evidence.includes("Original bill of sale"), "Original bill of sale"],
    [Boolean(clean(input.sellerName)), "Seller identity"],
    [input.paymentTrace !== "unknown", "Payment-trace status"],
    [input.activeHitKnown !== "unknown", "Stolen-hit status"],
    [Boolean(clean(input.itemDescription)), "Object description"],
    [input.evidence.length >= 4, "At least four preserved or requested evidence items"],
  ] as const;
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

export function buildDefensePacket(input: DefenseCaseInput): string {
  const issues = buildDefenseIssues(input);
  const tree = buildDependencyTree(input);
  const readiness = packetReadiness(input);
  const value = (v: string) => clean(v) || "Not established";
  const lines = [
    "# DEFENSE INTELLIGENCE PACKET",
    "## Wrongful Stolen-Vehicle Arrest + Search Defense",
    "",
    "Prepared for attorney review. This packet organizes user-provided information; it is not a legal conclusion, motion, or substitute for counsel.",
    "",
    "## Matter snapshot",
    `- Defendant: ${value(input.defendantName)}`,
    `- Jurisdiction: ${value(input.county)}, ${value(input.state)}`,
    `- Court / case: ${value(input.court)} / ${value(input.caseNumber)}`,
    `- Arrest date: ${value(input.arrestDate)}`,
    `- Next court date: ${value(input.nextCourtDate)}`,
    `- Custody status: ${input.custodyStatus}`,
    `- Counsel: ${input.represented === "yes" ? value(input.attorneyName) : input.represented}`,
    `- Charges alleged or filed: ${value(input.chargedOffenses)}`,
    `- Packet readiness: ${readiness.score}%`,
    "",
    "## Working case theory",
    `${value(input.defendantName)} reports purchasing ${value(input.vehicleYearMakeModel)} on ${value(input.purchaseDate)} from ${value(input.sellerName)} for ${value(input.purchasePrice)}. A bill of sale is ${input.evidence.includes("Original bill of sale") ? "preserved" : "not yet marked preserved"}. Police treated the vehicle as stolen, arrested the defendant, and then conducted the entered search in which officers reportedly found ${value(input.itemDescription)} at ${value(input.itemLocation)}. The accuracy and timing of the stolen-vehicle information, the facts known before arrest, the seller's authority, and the independent proof concerning the object remain matters for counsel to verify.`,
    "",
    "## Stop–Arrest–Search Timeline",
    `- Stop: ${value(input.stopReason)} at ${value(input.stopLocation)}`,
    `- Stolen-vehicle basis announced: ${value(input.vehicleHitAnnouncedAt)}`,
    `- Bill of sale presented: ${value(input.billOfSaleShownAt)}`,
    `- Handcuffed: ${value(input.handcuffedAt)}`,
    `- Arrested: ${value(input.arrestedAt)}`,
    `- Searched: ${value(input.searchedAt)} (${value(input.searchType)})`,
    `- Miranda warning: ${value(input.mirandaAt)}`,
    `- Statements: ${value(input.statements)}`,
    "",
    "## Vehicle provenance",
    `- Vehicle: ${value(input.vehicleYearMakeModel)}`,
    `- Physical/entered VIN: ${value(input.vehicleVin)}`,
    `- Bill-of-sale VIN: ${value(input.billOfSaleVin)}`,
    `- Stolen-report VIN: ${value(input.reportVin)}`,
    `- Physical/entered plate: ${value(input.vehiclePlate)}`,
    `- Stolen-report plate: ${value(input.reportPlate)}`,
    `- Seller: ${value(input.sellerName)} (${value(input.sellerContact)})`,
    `- Keys provided: ${input.keysProvided}; title provided: ${input.titleProvided}; payment trace: ${input.paymentTrace}; DMV transfer attempted: ${input.transferAttempted}`,
    "",
    "## Evidence dependency tree",
    ...tree.map((node) => `- ${node.parentId ? "  ↳ " : ""}${node.label} [${node.status}]`),
    "",
    "## Primary counsel-review issues",
    ...issues.flatMap((issue, index) => [`${index + 1}. **${issue.title}** [${issue.status}]`, `   - ${issue.summary}`, `   - Counsel question: ${issue.counselQuestion}`]),
    "",
    "## Seller / ownership-chain scenario",
    `- ${SELLER_LABELS[input.sellerScenario]}`,
    `- Notes: ${value(input.scenarioNotes)}`,
    "",
    "## Preserved or requested evidence",
    ...(input.evidence.length ? input.evidence.map((item) => `- ${item}`) : ["- None marked"]),
    "",
    "## Missing before counsel review",
    ...(readiness.missing.length ? readiness.missing.map((item) => `- ${item}`) : ["- No checklist gaps detected; source documents still require human verification."]),
    "",
    "## Legal-reference boundaries (California v1)",
    "- Vehicle Code §10851: review consent and intent elements against the filed theory.",
    "- Penal Code §496d: review whether the prosecution theory requires knowledge that the vehicle was stolen or unlawfully obtained.",
    "- Health & Safety Code §11364: separately analyze the object and proof concerning possession and use.",
    "- Penal Code §1538.5: procedural vehicle for specified search-and-seizure challenges; it does not itself create a substantive suppression ground.",
    "",
    "## Safety instructions",
    "Do not contact the seller, reporting party, witnesses, or law enforcement based solely on this packet. Preserve existing communications and ask licensed defense counsel about any further contact, discovery request, preservation notice, or filing.",
    "",
    `## Additional notes\n${value(input.notes)}`,
  ];
  return lines.join("\n");
}
