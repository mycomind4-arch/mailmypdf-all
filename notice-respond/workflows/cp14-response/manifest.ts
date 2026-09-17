import {
  buildWorkflowManifest,
  checkboxField,
  longTextField,
  personNameField,
  postalAddressField,
  referenceNumberField,
  selectField,
} from "@mailmypdf/workflows";

export const cp14Manifest = buildWorkflowManifest({
  id: "cp14-response",
  vertical: "notice-respond",
  title: "Respond to an IRS CP14 Notice",
  route: "/notice-respond/workflows/cp14-response/start",
  archetype: "official-response",
  adapters: ["government", "tax"],
  commerce: "paid",
  documents: [
    {
      id: "cp14-notice",
      label: "IRS CP14 notice",
      role: "primary",
      required: true,
      acceptedKinds: ["notice"],
      extractionSchema: "irs.cp14.v1",
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
        label: "How are you addressing the CP14?",
        required: true,
        options: [
          { value: "agree", label: "I agree with the balance due" },
          { value: "disagree", label: "I disagree with the balance due" },
          { value: "already_paid", label: "I already paid some or all of the amount" },
          { value: "other", label: "I need to send another documented response" },
        ],
      }),
      longTextField({
        id: "responseExplanation",
        label: "Explanation for your response",
        required: false,
        maxLength: 10_000,
        hint: "State only facts you can support with the notice or records you provide.",
      }),
    ],
    review: [
      checkboxField({
        id: "factsConfirmed",
        label: "I reviewed the extracted CP14 facts and corrected anything inaccurate.",
        required: true,
        origin: "extracted_confirmation",
      }),
      checkboxField({
        id: "mailingAppropriateConfirmed",
        label: "I confirmed that written correspondence and this mailing destination are appropriate for my notice or current IRS instructions.",
        required: true,
        origin: "user_provided",
      }),
    ],
    mail: [
      postalAddressField({
        id: "recipientAddress",
        label: "IRS mailing destination",
        required: true,
        origin: "extracted_confirmation",
        hint: "Confirm this against the destination printed on your notice or current IRS instructions. Do not use a generic IRS address.",
      }),
    ],
  },
});

export default cp14Manifest;
