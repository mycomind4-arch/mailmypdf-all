import {
  assessNameSourceAuthority,
} from "../../authority/source-authority";

import type {
  NameCandidate,
  NameResolutionContext,
} from "../../authority/types";

import type {
  NameRuleAssessment,
  NameRulePack,
} from "./types";

function assessGenericCandidate(
  candidate: NameCandidate,
  context: NameResolutionContext,
): NameRuleAssessment {
  const authority =
    assessNameSourceAuthority(
      candidate.source,
      context,
    );

  return {
    candidate,

    authority,

    eligible:
      authority.tier !==
      "irrelevant",

    reasons: [
      authority.explanation,
    ],
  };
}

export const genericNameRulePack: NameRulePack = {
  id: "generic-name-rules-v1",

  priority: 0,

  applies: () => true,

  assessSource(
    candidate,
    context,
  ) {
    return assessNameSourceAuthority(
      candidate.source,
      context,
    );
  },

  assessCandidate(
    candidate,
    context,
  ) {
    return assessGenericCandidate(
      candidate,
      context,
    );
  },

  requiresHumanReviewWhenResolved(
    context,
  ) {
    /**
     * Generic individual UCC naming should never silently become
     * filing-ready without a jurisdiction-specific rule.
     */
    return (
      context.purpose ===
        "ucc-debtor-name" &&
      context.subjectKind ===
        "individual"
    );
  },
};
