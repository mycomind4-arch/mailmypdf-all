import { ExtractionSchemaRegistry } from "@mailmypdf/document-intelligence";
import {
  certifyWorkflowQuality,
  defineWorkflow,
  type CapabilityId,
  type WorkflowAcceptanceEvidence,
} from "@mailmypdf/workflows";
import cp504DomainSpec from "./domain";
import cp504ExtractionSchema from "./extraction-schema";
import cp504Manifest from "./manifest";

export const cp504Workflow = defineWorkflow(cp504Manifest);

export const cp504ExtractionSchemas = new ExtractionSchemaRegistry()
  .register(cp504ExtractionSchema);

export function certifyCp504Definition(input?: {
  now?: string | Date;
  runtimeCapabilities?: readonly CapabilityId[];
  acceptance?: readonly WorkflowAcceptanceEvidence[];
}) {
  for (const schemaId of cp504DomainSpec.extractionSchemaIds) {
    cp504ExtractionSchemas.get(schemaId);
  }

  return certifyWorkflowQuality({
    manifest: cp504Manifest,
    domain: cp504DomainSpec,
    now: input?.now ?? new Date(),
    runtimeCapabilities: input?.runtimeCapabilities,
    acceptance: input?.acceptance,
  });
}

export const cp504Definition = {
  manifest: cp504Manifest,
  workflow: cp504Workflow,
  domain: cp504DomainSpec,
  extractionSchemas: cp504ExtractionSchemas,
} as const;

export default cp504Definition;
