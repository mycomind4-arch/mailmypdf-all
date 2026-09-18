import { buildWorkflowManifest } from "../../workflow-blueprints.js";
import {
  checkboxField,
  longTextField,
  personNameField,
  postalAddressField,
  referenceNumberField,
  selectField,
} from "../../workflow-fields.js";
import type { WorkflowManifest, WorkflowMaturity } from "../../workflow-manifest.js";
import type { NoticeResponseWorkflowProfile } from "./profiles.js";

export interface NoticeResponseManifestOptions {
  profile: NoticeResponseWorkflowProfile;
  route?: string;
  maturity?: WorkflowMaturity;
}

export function createNoticeResponseManifest(
  options: NoticeResponseManifestOptions,
): WorkflowManifest {
  const { profile } = options;
  return buildWorkflowManifest({
    id: profile.workflowId,
    vertical: "notice-respond",
    title: profile.title,
    route:
      options.route ??
      `/notice-respond/workflows/${profile.workflowId}/start`,
    archetype: "official-response",
    adapters: ["government", "tax"],
    commerce: "paid",
    maturity: options.maturity ?? "wired",
    documents: [
      {
        id: profile.primaryDocumentId,
        label: profile.primaryDocumentLabel,
        role: "primary",
        required: true,
        acceptedKinds: ["notice"],
        extractionSchema: profile.extractionSchema,
      },
      {
        id: "supporting-records",
        label: "Supporting records",
        role: "evidence",
        required: false,
        acceptedKinds: ["evidence", "form", "receipt", "correspondence"],
      },
    ],
    stepFields: {
      intake: [
        personNameField({
          id: "taxpayerName",
          label: "Your name",
          required: true,
        }),
        postalAddressField({
          id: "taxpayerAddress",
          label: "Your mailing address",
          required: true,
        }),
        referenceNumberField({
          id: "noticeNumber",
          label: "Notice/reference number",
          origin: "extracted_confirmation",
          sensitive: true,
        }),
      ],
      evidence: [
        checkboxField({
          id: "evidenceReviewComplete",
          label: "I reviewed the supporting-document set that will be used for this response.",
          required: true,
          origin: "user",
        }),
      ],
      strategy: [
        selectField({
          id: "responseMode",
          label: profile.responseModeLabel,
          required: true,
          options: profile.responseModes,
        }),
        longTextField({
          id: "responseExplanation",
          label: profile.explanationLabel,
          required: false,
          maxLength: 12_000,
          hint: profile.explanationHint,
        }),
        longTextField({
          id: "requestedAction",
          label: "Requested action",
          required: true,
          maxLength: 4_000,
        }),
      ],
      review: [
        checkboxField({
          id: "factsConfirmed",
          label: `I reviewed the extracted ${profile.noticeLabel} facts and corrected anything inaccurate.`,
          required: true,
          origin: "extracted_confirmation",
        }),
        checkboxField({
          id: "mailingAppropriateConfirmed",
          label:
            "I confirmed that written correspondence and this mailing destination are appropriate for my notice or current instructions.",
          required: true,
          origin: "user",
        }),
      ],
      mail: [
        postalAddressField({
          id: "recipientAddress",
          label: "Response mailing destination",
          required: true,
          origin: "extracted_confirmation",
          hint:
            "Confirm this against the destination printed on the controlling notice or current official instructions.",
        }),
      ],
    },
    acceptanceScenarios: [
      {
        id: "correct-notice-source",
        description:
          "The workflow must use the actual controlling notice and block a mismatched notice family.",
        required: true,
      },
      {
        id: "quarantined-source-or-evidence",
        description:
          "Unclean source or included evidence must block downstream drafting and packet assembly.",
        required: true,
      },
      {
        id: "stale-evidence-review",
        description:
          "Changing the supporting-document set after review must require a new evidence review.",
        required: true,
      },
      {
        id: "exact-packet-tamper",
        description:
          "Changing the packet or destination after approval must invalidate the approval.",
        required: true,
      },
      {
        id: "payment-mail-idempotency",
        description:
          "Repeated payment or fulfillment events must not create duplicate mailings.",
        required: true,
      },
    ],
  });
}
