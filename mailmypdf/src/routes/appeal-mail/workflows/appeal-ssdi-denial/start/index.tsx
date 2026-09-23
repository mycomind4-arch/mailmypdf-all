// Thin file-route mount for the top-level appeal-mail/workflows/appeal-ssdi-denial/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import SsdiDenialWorkflow from "../../../../../../../appeal-mail/workflows/appeal-ssdi-denial/start/index"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-ssdi-denial/start/")({
  component: SsdiDenialWorkflow,
})
