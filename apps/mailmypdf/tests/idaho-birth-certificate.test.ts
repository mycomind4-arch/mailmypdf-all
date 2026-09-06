import assert from "node:assert/strict";
import test from "node:test";

import {
  IDAHO_BIRTH_CERTIFICATE_WORKFLOW,
  calculateIdahoBirthCertificateStateFeeCents,
  resolveIdahoBirthCertificateRecipient,
} from "../src/products/vital-records/idaho-birth-certificate";

test("Idaho birth certificate requests route statewide regardless of county", () => {
  const ada = resolveIdahoBirthCertificateRecipient("Ada");
  const bonner = resolveIdahoBirthCertificateRecipient("Bonner");

  assert.deepEqual(ada, bonner);
  assert.equal(ada.name, "Idaho Bureau of Vital Records and Health Statistics");
  assert.equal(ada.line1, "PO Box 83720");
  assert.equal(ada.city, "Boise");
  assert.equal(ada.state, "ID");
  assert.equal(ada.postalCode, "83720-0036");
  assert.equal(IDAHO_BIRTH_CERTIFICATE_WORKFLOW.routingMode, "state-centralized");
  assert.equal(IDAHO_BIRTH_CERTIFICATE_WORKFLOW.countyBehavior, "collect-only");
});

test("Idaho state fee is $16 per certificate/search plus a one-time $10 rush fee", () => {
  assert.equal(calculateIdahoBirthCertificateStateFeeCents(1, false), 1600);
  assert.equal(calculateIdahoBirthCertificateStateFeeCents(2, false), 3200);
  assert.equal(calculateIdahoBirthCertificateStateFeeCents(2, true), 4200);
});

test("invalid copy counts normalize to one copy", () => {
  assert.equal(calculateIdahoBirthCertificateStateFeeCents(0, false), 1600);
  assert.equal(calculateIdahoBirthCertificateStateFeeCents(Number.NaN, true), 2600);
});

test("end-to-end MailMyPDF fulfillment stays blocked while physical payment is required", () => {
  assert.equal(IDAHO_BIRTH_CERTIFICATE_WORKFLOW.fulfillment.endToEndMailingBlocked, true);
  assert.equal(IDAHO_BIRTH_CERTIFICATE_WORKFLOW.fulfillment.mailMyPdfCanSupplySignedCheckOrMoneyOrder, false);
});
