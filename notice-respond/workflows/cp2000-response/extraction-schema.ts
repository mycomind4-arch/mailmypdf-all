import { createDocumentExtractionSchema } from "@mailmypdf/document-intelligence";

export const cp2000ExtractionSchema = createDocumentExtractionSchema({
  id: "irs.cp2000.v1",
  version: 1,
  documentKinds: ["notice"],
  strict: true,
  fields: [
    {
      id: "noticeSeries",
      label: "Notice series",
      type: "text",
      description: "The CP2000-series identifier printed on the notice",
      required: true,
      allowedValues: ["CP2000", "CP2000A", "CP2000B", "CP2000C", "CP2000D", "CP2000E"],
    },
    {
      id: "noticeDate",
      label: "Notice date",
      type: "date",
      description: "The notice date printed by the IRS",
      required: true,
    },
    {
      id: "responseDate",
      label: "Reply-by date",
      type: "date",
      description: "The response date printed on the controlling notice; never calculate a substitute",
      required: true,
    },
    {
      id: "taxYear",
      label: "Tax year",
      type: "text",
      description: "The tax year or period identified by the notice",
      required: true,
      maxLength: 40,
    },
    {
      id: "referenceNumber",
      label: "Reference number",
      type: "text",
      description: "Notice, reference, or control number printed on the notice",
      required: false,
      maxLength: 200,
    },
    {
      id: "proposedChanges",
      label: "Proposed changes",
      type: "text_list",
      description: "Each proposed income, payment, credit, deduction, or other adjustment identified by the notice",
      required: true,
    },
    {
      id: "payerReferences",
      label: "Payer or information-return references",
      type: "text_list",
      description: "Employers, financial institutions, forms, or other third-party items identified in the discrepancy",
      required: false,
    },
    {
      id: "proposedTax",
      label: "Proposed tax",
      type: "money",
      description: "Proposed tax amount exactly as printed, if shown separately",
      required: false,
    },
    {
      id: "proposedPenalty",
      label: "Proposed penalty",
      type: "money",
      description: "Proposed penalty amount exactly as printed, if shown separately",
      required: false,
    },
    {
      id: "proposedInterest",
      label: "Proposed interest",
      type: "money",
      description: "Proposed interest amount exactly as printed, if shown separately",
      required: false,
    },
    {
      id: "responseAddress",
      label: "IRS response address",
      type: "postal_address",
      description: "The response address printed on the notice",
      required: true,
    },
  ],
});

export default cp2000ExtractionSchema;
