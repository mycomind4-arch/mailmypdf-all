import { createFileRoute } from "@tanstack/react-router";
import { SecuredTransactionEligibilityIntake } from "./EligibilityIntake";

export const Route = createFileRoute("/secured-transactions/workflows/secured-transaction-eligibility/start/")({
  component: SecuredTransactionEligibilityIntake,
});
