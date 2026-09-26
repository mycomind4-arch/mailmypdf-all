// Thin file-route mount for the top-level secured-transactions/workflows/priority-strategy/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import { SecuredTransactionReviewIntake } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionReviewIntake"

export const Route = createFileRoute("/secured-transactions/workflows/priority-strategy/start/")({
  component: () => <SecuredTransactionReviewIntake workflowId="priority-strategy" />,
})
