import { composeWorkflow, type WorkflowFactoryResult } from "./workflow-factory.js";
import type { WorkflowManifest, WorkflowMaturity } from "./workflow-manifest.js";

export class WorkflowRegistry {
  private readonly manifests = new Map<string, WorkflowManifest>();

  register(manifest: WorkflowManifest): void {
    if (this.manifests.has(manifest.id)) throw new Error(`Duplicate workflow registration: ${manifest.id}`);
    this.manifests.set(manifest.id, manifest);
  }

  upsert(manifest: WorkflowManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  get(id: string): WorkflowManifest | undefined {
    return this.manifests.get(id);
  }

  list(): WorkflowManifest[] {
    return [...this.manifests.values()];
  }

  compose(id: string): WorkflowFactoryResult {
    const manifest = this.get(id);
    if (!manifest) throw new Error(`Unknown workflow: ${id}`);
    return composeWorkflow(manifest);
  }

  byMaturity(maturity: WorkflowMaturity): WorkflowManifest[] {
    return this.list().filter((manifest) => manifest.maturity === maturity);
  }

  executable(): WorkflowManifest[] {
    return this.list().filter((manifest) => ["executable", "gold", "production-verified"].includes(manifest.maturity));
  }

  productionVerified(): WorkflowManifest[] {
    return this.byMaturity("production-verified");
  }

  assertNoDuplicateRoutes(): void {
    const routes = new Map<string, string>();
    for (const manifest of this.list()) {
      const existing = routes.get(manifest.route);
      if (existing && existing !== manifest.id) throw new Error(`Duplicate workflow route ${manifest.route}: ${existing} and ${manifest.id}`);
      routes.set(manifest.route, manifest.id);
    }
  }
}

export const workflowRegistry = new WorkflowRegistry();
