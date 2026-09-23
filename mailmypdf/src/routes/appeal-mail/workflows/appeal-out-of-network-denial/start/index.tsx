// Thin file-route mount for the top-level appeal-mail/workflows/appeal-out-of-network-denial/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../appeal-mail/workflows/appeal-out-of-network-denial/start/index"

export const Route = createFileRoute("/appeal-mail/workflows/appeal-out-of-network-denial/start/")({
  component: StartComponent,
})
