import { createDocumentExtractionSchema } from "@mailmypdf/document-intelligence";

export const cp504ExtractionSchema = createDocumentExtractionSchema({
  id: "irs.cp504.v1",
  version: 1,
  documentKinds: ["notice"],
  strict: true,
  fields: [
    {
      id: "noticeSeries",
      label: "Notice series",
      type: "text",
      description: "The CP504 identifier printed on the controlling notice",
      required: true,
      allowedValues: ["CP504"],
    },
    {
      id: "noticeDate",
      label: "Notice date",
      type: "date",
      description: "The notice date printed by the IRS",
      required: true,
    },
    {
      id: "actionDate",
      label: "Printed action or payment date",
      type: "date",
      description:
        "A payment, response, or action date actually printed on the controlling notice; never calculate a substitute",
      required: false,
    },
    {
      id: "taxPeriod",
      label: "Tax year or period",
      type: "text",
      description: "The tax year or tax period identified by the notice",
      required: true,
      maxLength: 80,
    },
    {
      id: "referenceNumber",
      label: "Notice/reference number",
      type: "text",
      description:
        "Notice, reference, caller ID, or control number printed on the notice",
      required: false,
      maxLength: 200,
    },
    {
      id: "amountDue",
      label: "Amount due",
      type: "money",
      description: "The unpaid amount exactly as printed on the notice",
      required: true,
    },
    {
      id: "contactPhone",
      label: "IRS contact phone",
      type: "text",
      description: "The telephone number printed on the notice",
      required: false,
      maxLength: 80,
    },
    {
      id: "responseAddress",
      label: "IRS mailing destination",
      type: "postal_address",
      description:
        "A mailing destination printed on the notice for correspondence or a notice-controlled appeal request, if present",
      required: false,
    },
    {
      id: "collectionWarnings",
      label: "Collection warnings",
      type: "text_list",
      description:
        "Collection actions or consequences described by the notice, preserved as notice-supported statements",
      required: false,
    },
    {
      id: "appealInstructions",
      label: "Appeal instructions",
      type: "text_list",
      description:
        "Any CAP or other appeal instructions actually printed on the notice, including named forms or contact instructions",
      required: false,
    },
  ],
});

export default cp504ExtractionSchema;
