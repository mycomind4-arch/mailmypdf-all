export type GrowthScenario = {
  name: string;
  monthlyVisitors: number;
  visitorToOrderRate: number;
  repeatOrdersPerNewCustomer: number;
  proAdoptionRate: number;
  monthlyProChurn: number;
  refundRate: number;
  paidTrafficShare: number;
  cacPerNewCustomer: number;
  avgOrderRevenueCents: number;
  avgFulfillmentCostCents: number;
  avgPaymentCostCents: number;
  avgSupportCostCents: number;
  proMonthlyContributionCents: number;
};

export type GrowthSimulationResult = {
  newCustomers: number;
  totalOrders: number;
  grossRevenueCents: number;
  refundLossCents: number;
  fulfillmentCostCents: number;
  paymentCostCents: number;
  supportCostCents: number;
  acquisitionCostCents: number;
  proContributionCents: number;
  contributionCents: number;
  contributionMargin: number;
  contributionAfterAcquisitionCents: number;
};

export function simulateGrowth(scenario: GrowthScenario): GrowthSimulationResult {
  const newCustomers = scenario.monthlyVisitors * scenario.visitorToOrderRate;
  const totalOrders = newCustomers * scenario.repeatOrdersPerNewCustomer;
  const grossRevenueCents = totalOrders * scenario.avgOrderRevenueCents;
  const refundLossCents = grossRevenueCents * scenario.refundRate;
  const fulfillmentCostCents = totalOrders * scenario.avgFulfillmentCostCents;
  const paymentCostCents = totalOrders * scenario.avgPaymentCostCents;
  const supportCostCents = totalOrders * scenario.avgSupportCostCents;
  const acquisitionCostCents = newCustomers * scenario.cacPerNewCustomer;
  const proMembers = newCustomers * scenario.proAdoptionRate;
  const retainedProMembers = proMembers * (1 - scenario.monthlyProChurn);
  const proContributionCents = retainedProMembers * scenario.proMonthlyContributionCents;
  const contributionCents = grossRevenueCents - refundLossCents - fulfillmentCostCents - paymentCostCents - supportCostCents;

  return {
    newCustomers,
    totalOrders,
    grossRevenueCents,
    refundLossCents,
    fulfillmentCostCents,
    paymentCostCents,
    supportCostCents,
    acquisitionCostCents,
    proContributionCents,
    contributionCents,
    contributionMargin: grossRevenueCents > 0 ? contributionCents / grossRevenueCents : 0,
    contributionAfterAcquisitionCents: contributionCents + proContributionCents - acquisitionCostCents,
  };
}

export const GROWTH_SCENARIOS: Record<string, GrowthScenario> = {
  conservative: { name: "Conservative", monthlyVisitors: 10_000, visitorToOrderRate: 0.015, repeatOrdersPerNewCustomer: 1.3, proAdoptionRate: 0.02, monthlyProChurn: 0.10, refundRate: 0.05, paidTrafficShare: 0.60, cacPerNewCustomer: 4.00, avgOrderRevenueCents: 705, avgFulfillmentCostCents: 240, avgPaymentCostCents: 55, avgSupportCostCents: 20, proMonthlyContributionCents: 650 },
  base: { name: "Base", monthlyVisitors: 10_000, visitorToOrderRate: 0.025, repeatOrdersPerNewCustomer: 1.7, proAdoptionRate: 0.04, monthlyProChurn: 0.07, refundRate: 0.03, paidTrafficShare: 0.40, cacPerNewCustomer: 2.50, avgOrderRevenueCents: 705, avgFulfillmentCostCents: 240, avgPaymentCostCents: 55, avgSupportCostCents: 20, proMonthlyContributionCents: 650 },
  upside: { name: "Upside", monthlyVisitors: 10_000, visitorToOrderRate: 0.04, repeatOrdersPerNewCustomer: 2.4, proAdoptionRate: 0.08, monthlyProChurn: 0.05, refundRate: 0.02, paidTrafficShare: 0.25, cacPerNewCustomer: 1.50, avgOrderRevenueCents: 705, avgFulfillmentCostCents: 240, avgPaymentCostCents: 55, avgSupportCostCents: 20, proMonthlyContributionCents: 650 },
};

export function rankScenarios(scenarios: GrowthScenario[] = Object.values(GROWTH_SCENARIOS)): GrowthSimulationResult[] {
  return scenarios.map(simulateGrowth).sort((a, b) => b.contributionAfterAcquisitionCents - a.contributionAfterAcquisitionCents);
}
