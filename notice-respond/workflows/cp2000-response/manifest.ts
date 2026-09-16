import {
  buildWorkflowManifest,
  checkboxField,
  longTextField,
  personNameField,
  postalAddressField,
  referenceNumberField,
  selectField,
} from "@mailmypdf/workflows";

export const cp2000Manifest = buildWorkflowManifest({
  id: "cp2000-response",
  vertical: "notice-respond",
  title: "Respond to an IRS CP2000 Notice",
  route: "/notice-respond/workflows/cp2000-response",
  archetype: "official-response",
  adapters: ["government", "tax"],
  commerce: "paid",
  documents: [
    {
      id: "cp2000-notice",
      label: "IRS CP2000 notice",
      role: "primary",
      required: true,
      acceptedKinds: ["notice"],
      extractionSchema: "irs.cp2000.v1",
    },
    {
      id: "supporting-records",
      label: "Supporting records for disputed items",
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
        id: "senderAddress",
        label: "Your mailing address",
        required: true,
      }),
      referenceNumberField({
        id: "referenceNumber",
        label: "Notice/reference number",
        origin: "extracted_confirmation",
        sensitive: true,
      }),
    ],
    strategy: [
      selectField({
        id: "responseMode",
        label: "How do you want to respond?",
        required: true,
        options: [
          { value: "agree", label: "Agree with the proposed changes" },
          { value: "disagree", label: "Disagree with the proposed changes" },
          { value: "partial-agreement", label: "Partially agree" },
        ],
      }),
      longTextField({
        id: "responseExplanation",
        label: "Explanation for your response",
        required: false,
        maxLength: 10_000,
        hint: "State facts you can support with the notice or records you provide.",
      }),
    ],
    review: [
      checkboxField({
        id: "factsConfirmed",
        label: "I reviewed the extracted notice facts and corrected anything inaccurate.",
        required: true,
        origin: "extracted_confirmation",
      }),
    ],
    mail: [
      postalAddressField({
        id: "recipientAddress",
        label: "IRS response address",
        required: true,
        origin: "extracted_confirmation",
        hint: "Confirm this against the response address printed on your notice.",
      }),
    ],
  },
});

export default cp2000Manifest;
