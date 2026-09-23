// Thin file-route mount for the top-level records-request/workflows/agency-records-request/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import StartComponent from "../../../../../../../records-request/workflows/agency-records-request/start/index"

export const Route = createFileRoute("/records-request/workflows/agency-records-request/start/")({
  component: StartComponent,
})
