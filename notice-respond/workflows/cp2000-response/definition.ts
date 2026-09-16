import { ExtractionSchemaRegistry } from "@mailmypdf/document-intelligence";
import {
  certifyWorkflowQuality,
  defineWorkflow,
  type CapabilityId,
  type WorkflowAcceptanceEvidence,
} from "@mailmypdf/workflows";
import cp2000DomainSpec from "./domain";
import cp2000ExtractionSchema from "./extraction-schema";
import cp2000Manifest from "./manifest";

export const cp2000Workflow = defineWorkflow(cp2000Manifest);

export const cp2000ExtractionSchemas = new ExtractionSchemaRegistry()
  .register(cp2000ExtractionSchema);

export function certifyCp2000Definition(input?: {
  now?: string | Date;
  runtimeCapabilities?: readonly CapabilityId[];
  acceptance?: readonly WorkflowAcceptanceEvidence[];
}) {
  for (const schemaId of cp2000DomainSpec.extractionSchemaIds) {
    cp2000ExtractionSchemas.get(schemaId);
  }

  return certifyWorkflowQuality({
    manifest: cp2000Manifest,
    domain: cp2000DomainSpec,
    now: input?.now ?? new Date(),
    runtimeCapabilities: input?.runtimeCapabilities,
    acceptance: input?.acceptance,
  });
}

export const cp2000Definition = {
  manifest: cp2000Manifest,
  workflow: cp2000Workflow,
  domain: cp2000DomainSpec,
  extractionSchemas: cp2000ExtractionSchemas,
} as const;

export default cp2000Definition;
