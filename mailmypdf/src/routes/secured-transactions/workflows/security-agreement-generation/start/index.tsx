// Thin file-route mount for the top-level secured-transactions/workflows/security-agreement-generation/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { SecuredTransactionReviewIntake } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionReviewIntake"

export const Route = createFileRoute("/secured-transactions/workflows/security-agreement-generation/start/")({
  component: () => <SecuredTransactionReviewIntake workflowId="security-agreement-generation" />,
})
