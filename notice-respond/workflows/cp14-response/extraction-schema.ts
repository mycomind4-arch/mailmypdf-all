import { createDocumentExtractionSchema } from "@mailmypdf/document-intelligence";

export const cp14ExtractionSchema = createDocumentExtractionSchema({
  id: "irs.cp14.v1",
  version: 1,
  documentKinds: ["notice"],
  strict: true,
  fields: [
    {
      id: "noticeSeries",
      label: "Notice series",
      type: "text",
      description: "The CP14-series identifier printed on the notice",
      required: true,
      allowedValues: ["CP14", "CP14C", "CP14F", "CP14G", "CP14I", "CP14IA", "CP14K"],
    },
    {
      id: "noticeDate",
      label: "Notice date",
      type: "date",
      description: "The notice date printed by the IRS",
      required: true,
    },
    {
      id: "dueDate",
      label: "Payment or action due date",
      type: "date",
      description: "The controlling due date printed on the notice or controlling cover sheet; never calculate a substitute",
      required: false,
    },
    {
      id: "taxPeriod",
      label: "Tax year or period",
      type: "text",
      description: "The tax year or tax period identified by the notice",
      required: true,
      maxLength: 40,
    },
    {
      id: "referenceNumber",
      label: "Notice/reference number",
      type: "text",
      description: "Notice, reference, caller ID, or control number printed on the notice",
      required: false,
      maxLength: 200,
    },
    {
      id: "balanceDue",
      label: "Balance due",
      type: "money",
      description: "The amount due exactly as printed on the notice",
      required: true,
    },
    {
      id: "taxAmount",
      label: "Tax amount",
      type: "money",
      description: "Tax amount printed separately on the notice, if present",
      required: false,
    },
    {
      id: "penaltyAmount",
      label: "Penalty amount",
      type: "money",
      description: "Penalty amount printed separately on the notice, if present",
      required: false,
    },
    {
      id: "interestAmount",
      label: "Interest amount",
      type: "money",
      description: "Interest amount printed separately on the notice, if present",
      required: false,
    },
    {
      id: "helpPhone",
      label: "IRS help phone number",
      type: "text",
      description: "The telephone number printed in the IRS Help section of the notice",
      required: false,
      maxLength: 80,
    },
    {
      id: "responseAddress",
      label: "IRS mailing destination",
      type: "postal_address",
      description: "A mailing destination printed on the notice for correspondence, if the notice actually provides one",
      required: false,
    },
  ],
});

export default cp14ExtractionSchema;
