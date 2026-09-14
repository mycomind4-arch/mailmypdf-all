export type VitalRecordRoutingMode = "state-centralized" | "county-specific";

export type VitalRecordMailRecipient = {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

/**
 * Idaho birth certificates are issued through the statewide Bureau of Vital Records.
 * County of birth may be captured as supplemental lookup context, but it NEVER changes
 * the mailing destination for this workflow.
 *
 * Sources reviewed 2026-09-06:
 * - https://healthandwelfare.idaho.gov/services-programs/birth-marriage-death-records/ordering-birth-certificate
 * - https://publicdocuments.dhw.idaho.gov/WebLink/ElectronicFile.aspx?dbid=0&docid=25541&repo=PUBLIC-DOCUMENTS
 */
export const IDAHO_BIRTH_CERTIFICATE_WORKFLOW = {
  id: "idaho-birth-certificate",
  title: "Request an Idaho Birth Certificate by Mail",
  stateCode: "ID",
  stateName: "Idaho",
  recordType: "birth-certificate",
  routingMode: "state-centralized" as VitalRecordRoutingMode,
  countyBehavior: "collect-only" as const,
  sourceReviewedAt: "2026-09-06",
  officialOrderingUrl:
    "https://healthandwelfare.idaho.gov/services-programs/birth-marriage-death-records/ordering-birth-certificate",
  officialFormUrl:
    "https://publicdocuments.dhw.idaho.gov/WebLink/ElectronicFile.aspx?dbid=0&docid=25541&repo=PUBLIC-DOCUMENTS",
  recipient: {
    name: "Idaho Bureau of Vital Records and Health Statistics",
    line1: "PO Box 83720",
    line2: null,
    city: "Boise",
    state: "ID",
    postalCode: "83720-0036",
  } satisfies VitalRecordMailRecipient,
  stateFees: {
    certifiedCopyOrSearchCents: 1600,
    rushOrderCents: 1000,
  },
  requiredMailEnclosures: [
    "Signed birth certificate request form or signed request letter containing the required information",
    "Copy of acceptable current identification; when using picture ID, include both sides and ensure signature and expiration date are visible",
    "Signed check or money order for the state fee payable to Idaho Vital Records",
  ] as const,
  fulfillment: {
    mailMyPdfCanPrepareApplication: true,
    mailMyPdfCanPrepareIdCopy: true,
    mailMyPdfCanSupplySignedCheckOrMoneyOrder: false,
    endToEndMailingBlocked: true,
    blocker:
      "Idaho requires a signed check or money order with mailed certificate requests. MailMyPDF must not claim end-to-end mailing until a compliant physical payment-enclosure capability exists.",
  },
} as const;

/** County is intentionally ignored for routing in Idaho. */
export function resolveIdahoBirthCertificateRecipient(
  _countyOfBirth?: string,
): VitalRecordMailRecipient {
  return { ...IDAHO_BIRTH_CERTIFICATE_WORKFLOW.recipient };
}

export function calculateIdahoBirthCertificateStateFeeCents(
  copies: number,
  rush: boolean,
): number {
  const normalizedCopies = Number.isFinite(copies) ? Math.max(1, Math.floor(copies)) : 1;
  return (
    normalizedCopies * IDAHO_BIRTH_CERTIFICATE_WORKFLOW.stateFees.certifiedCopyOrSearchCents +
    (rush ? IDAHO_BIRTH_CERTIFICATE_WORKFLOW.stateFees.rushOrderCents : 0)
  );
}
