import test from "node:test";
import assert from "node:assert/strict";

function simulate(s) {
  const newCustomers = s.visitors * s.conversion;
  const orders = newCustomers * s.repeat;
  const revenue = orders * s.aov;
  const refunds = revenue * s.refund;
  const fulfillment = orders * s.fulfillment;
  const payment = orders * s.payment;
  const support = orders * s.support;
  const acquisition = newCustomers * s.cac;
  const pro = newCustomers * s.proAdoption * (1 - s.proChurn) * s.proContribution;
  const contribution = revenue - refunds - fulfillment - payment - support;
  return contribution + pro - acquisition;
}

const base = { visitors: 10000, conversion: 0.025, repeat: 1.7, aov: 705, refund: 0.03, fulfillment: 240, payment: 55, support: 20, cac: 2.5, proAdoption: 0.04, proChurn: 0.07, proContribution: 650 };

test("growth model improves when repeat behavior improves", () => {
  const current = simulate(base);
  const repeatWinner = simulate({ ...base, repeat: 2.0 });
  assert.ok(repeatWinner > current);
});

test("growth model improves when CAC falls", () => {
  const current = simulate(base);
  const lowerCac = simulate({ ...base, cac: 1.75 });
  assert.ok(lowerCac > current);
});

test("growth model penalizes refund leakage", () => {
  const current = simulate(base);
  const higherRefunds = simulate({ ...base, refund: 0.08 });
  assert.ok(higherRefunds < current);
});
