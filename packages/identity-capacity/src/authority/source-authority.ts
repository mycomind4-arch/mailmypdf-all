import type {
  AuthorityTier,
  NameCandidateSource,
  NameResolutionContext,
  SourceAuthorityAssessment,
} from "./types";

const TIER_SCORE: Record<
  AuthorityTier,
  number
> = {
  controlling: 100,
  strong: 80,
  supporting: 50,
  weak: 20,
  irrelevant: 0,
};

function assessment(
  source: NameCandidateSource,
  tier: AuthorityTier,
  reasonCode: string,
  explanation: string,
): SourceAuthorityAssessment {
  return {
    sourceId: source.sourceId,
    tier,
    score: TIER_SCORE[tier],
    reasonCode,
    explanation,
  };
}

/**
 * Generic contextual source-authority resolver.
 *
 * This is intentionally conservative.
 * Jurisdiction-specific rule packs may override these defaults.
 */
export function assessNameSourceAuthority(
  source: NameCandidateSource,
  context: NameResolutionContext,
): SourceAuthorityAssessment {
  const {
    purpose,
    subjectKind,
  } = context;

  /**
   * Registered organizations.
   */
  if (
    subjectKind ===
    "registered-organization"
  ) {
    if (
      source.sourceType ===
        "public-organic-record"
    ) {
      return assessment(
        source,
        "controlling",
        "REGISTERED_ORG_PUBLIC_ORGANIC_RECORD",
        "A public organic record directly establishes the legally organized name of a registered organization for purposes where that record controls.",
      );
    }

    if (
      source.sourceType ===
        "business-registry"
    ) {
      return assessment(
        source,
        "strong",
        "REGISTERED_ORG_BUSINESS_REGISTRY",
        "An official business registry strongly supports the registered organization's legal name.",
      );
    }

    if (
      source.sourceType ===
        "contract"
    ) {
      return assessment(
        source,
        "supporting",
        "REGISTERED_ORG_CONTRACT",
        "A contract may corroborate the organization's name but is not inherently controlling.",
      );
    }

    if (
      [
        "invoice",
        "website",
        "user-statement",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "weak",
        "REGISTERED_ORG_WEAK_SOURCE",
        "The source may reflect how the organization describes itself but does not establish the registered legal name.",
      );
    }
  }

  /**
   * Individuals.
   *
   * Generic rules intentionally do not assume one universally controlling
   * identity document for every legal purpose.
   */
  if (
    subjectKind === "individual"
  ) {
    if (
      [
        "drivers-license",
        "passport",
        "birth-record",
        "court-order",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "strong",
        "INDIVIDUAL_GOVERNMENT_IDENTITY_RECORD",
        "A government identity or court record strongly supports the individual's name, subject to jurisdiction- and purpose-specific rules.",
      );
    }

    if (
      [
        "bank-record",
        "tax-record",
        "property-record",
        "certificate-of-title",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "supporting",
        "INDIVIDUAL_SECONDARY_OFFICIAL_RECORD",
        "The source may corroborate the individual's name but is generally secondary to direct identity evidence.",
      );
    }

    if (
      source.sourceType ===
        "contract"
    ) {
      return assessment(
        source,
        "supporting",
        "INDIVIDUAL_CONTRACT_RECORD",
        "A contract may support the name used in a transaction but does not independently establish identity.",
      );
    }

    if (
      [
        "invoice",
        "website",
        "user-statement",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "weak",
        "INDIVIDUAL_WEAK_SOURCE",
        "The source provides weak evidence of the individual's authoritative legal name.",
      );
    }
  }

  /**
   * Trusts.
   */
  if (
    subjectKind === "trust"
  ) {
    if (
      source.sourceType ===
        "trust-instrument"
    ) {
      return assessment(
        source,
        "controlling",
        "TRUST_GOVERNING_INSTRUMENT",
        "The governing trust instrument directly establishes the trust name represented by that instrument.",
      );
    }

    if (
      [
        "property-record",
        "bank-record",
        "tax-record",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "supporting",
        "TRUST_SECONDARY_RECORD",
        "The source may corroborate the trust name but is not inherently the governing source.",
      );
    }

    if (
      [
        "website",
        "invoice",
        "user-statement",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "weak",
        "TRUST_WEAK_SOURCE",
        "The source is weak evidence of the trust's authoritative name.",
      );
    }
  }

  /**
   * Estates.
   */
  if (
    subjectKind === "estate"
  ) {
    if (
      [
        "estate-record",
        "letters-testamentary",
        "letters-administration",
        "court-order",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "controlling",
        "ESTATE_COURT_RECORD",
        "A probate or court-issued estate record directly supports the estate name represented by the proceeding.",
      );
    }

    if (
      [
        "property-record",
        "bank-record",
        "tax-record",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "supporting",
        "ESTATE_SECONDARY_RECORD",
        "The source may corroborate the estate name but is not inherently controlling.",
      );
    }

    if (
      source.sourceType ===
        "user-statement"
    ) {
      return assessment(
        source,
        "weak",
        "ESTATE_USER_ASSERTION",
        "A user assertion alone does not establish the legal name of an estate.",
      );
    }
  }

  /**
   * Property ownership questions.
   */
  if (
    purpose ===
    "property-owner-name"
  ) {
    if (
      source.sourceType ===
        "certificate-of-title"
    ) {
      return assessment(
        source,
        "strong",
        "PROPERTY_CERTIFICATE_OF_TITLE",
        "A certificate of title strongly supports the named ownership interest for titled property.",
      );
    }

    if (
      source.sourceType ===
        "property-record"
    ) {
      return assessment(
        source,
        "strong",
        "PROPERTY_RECORD",
        "An official property record strongly supports the name associated with the recorded ownership interest.",
      );
    }
  }

  /**
   * Court-party-name questions.
   */
  if (
    purpose ===
    "court-party-name"
  ) {
    if (
      source.sourceType ===
        "court-order"
    ) {
      return assessment(
        source,
        "strong",
        "COURT_RECORD",
        "A court record strongly supports the party name used in that proceeding.",
      );
    }
  }

  /**
   * UCC debtor-name questions are intentionally conservative here.
   *
   * Jurisdiction-specific rule packs should make the final determination.
   */
  if (
    purpose ===
    "ucc-debtor-name"
  ) {
    if (
      subjectKind ===
        "registered-organization" &&
      source.sourceType ===
        "public-organic-record"
    ) {
      return assessment(
        source,
        "controlling",
        "UCC_REGISTERED_ORG_PUBLIC_ORGANIC_RECORD",
        "For a registered organization, the public organic record is the controlling generic source for debtor-name analysis, subject to applicable jurisdictional rules.",
      );
    }

    if (
      subjectKind ===
        "individual" &&
      [
        "drivers-license",
        "passport",
        "birth-record",
        "court-order",
      ].includes(
        source.sourceType,
      )
    ) {
      return assessment(
        source,
        "strong",
        "UCC_INDIVIDUAL_IDENTITY_SOURCE",
        "The source strongly supports an individual debtor-name candidate, but the controlling rule must come from the applicable jurisdiction.",
      );
    }
  }

  /**
   * General fallback.
   */
  if (
    source.sourceType ===
      "user-statement"
  ) {
    return assessment(
      source,
      "weak",
      "USER_ASSERTION",
      "A user statement may initiate investigation but should not establish an authoritative name by itself.",
    );
  }

  if (
    [
      "invoice",
      "website",
    ].includes(
      source.sourceType,
    )
  ) {
    return assessment(
      source,
      "weak",
      "INFORMAL_NAME_SOURCE",
      "The source may provide a useful search or discovery name but is weak evidence for authoritative resolution.",
    );
  }

  if (
    source.sourceType ===
      "other"
  ) {
    return assessment(
      source,
      "weak",
      "UNCLASSIFIED_SOURCE",
      "The source has not yet been assigned a stronger authority rule.",
    );
  }

  return assessment(
    source,
    "supporting",
    "GENERIC_SUPPORTING_SOURCE",
    "The source may support name resolution, but no more specific authority rule currently applies.",
  );
}

/**
 * Deterministic authority ordering utility.
 */
export function compareSourceAuthority(
  left: SourceAuthorityAssessment,
  right: SourceAuthorityAssessment,
): number {
  return right.score - left.score;
}

/**
 * Returns the highest-ranked assessment.
 */
export function strongestSourceAuthority(
  assessments: SourceAuthorityAssessment[],
): SourceAuthorityAssessment | undefined {
  return [...assessments].sort(
    compareSourceAuthority,
  )[0];
}
