// Thin file-route mount for the top-level records-request/workflows/open-records-request/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../records-request/workflows/open-records-request/start/index"

export const Route = createFileRoute("/records-request/workflows/open-records-request/start/")({
  component: StartComponent,
})
