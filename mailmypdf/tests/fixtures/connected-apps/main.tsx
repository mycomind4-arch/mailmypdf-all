import { createRoot } from "react-dom/client";
import { ConnectedApps, type ConnectedAppsApi } from "../../../src/components/ConnectedApps";
import "../../../src/styles.css";

const scenario = new URLSearchParams(location.search).get("scenario");
let attempts = 0;
let grants = scenario === "empty" ? [] : [{
  client: { id: "11111111-1111-4111-8111-111111111111", name: "Example AI assistant", uri: "", logo_uri: "" },
  scopes: ["email", "profile"], granted_at: "2026-09-27T00:00:00Z",
}];
const api: ConnectedAppsApi = {
  async list() {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (scenario === "load-error" && attempts++ === 0) throw new Error("private server detail");
    return grants;
  },
  async revoke(clientId) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (scenario === "revoke-error") throw new Error("private server detail");
    if (clientId !== grants[0]?.client.id) throw new Error("Wrong client");
    grants = [];
  },
};

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-3xl p-4 sm:p-8">
    <h1 className="mb-6 font-serif text-2xl">Account settings — test data only</h1>
    <ConnectedApps api={api} />
  </main>,
);
