import { ExtractionSchemaRegistry } from "@mailmypdf/document-intelligence";
import {
  certifyWorkflowQuality,
  defineWorkflow,
  type CapabilityId,
  type WorkflowAcceptanceEvidence,
} from "@mailmypdf/workflows";
import cp14DomainSpec from "./domain";
import cp14ExtractionSchema from "./extraction-schema";
import cp14Manifest from "./manifest";

export const cp14Workflow = defineWorkflow(cp14Manifest);

export const cp14ExtractionSchemas = new ExtractionSchemaRegistry()
  .register(cp14ExtractionSchema);

export function certifyCp14Definition(input?: {
  now?: string | Date;
  runtimeCapabilities?: readonly CapabilityId[];
  acceptance?: readonly WorkflowAcceptanceEvidence[];
}) {
  for (const schemaId of cp14DomainSpec.extractionSchemaIds) {
    cp14ExtractionSchemas.get(schemaId);
  }

  return certifyWorkflowQuality({
    manifest: cp14Manifest,
    domain: cp14DomainSpec,
    now: input?.now ?? new Date(),
    runtimeCapabilities: input?.runtimeCapabilities,
    acceptance: input?.acceptance,
  });
}

export const cp14Definition = {
  manifest: cp14Manifest,
  workflow: cp14Workflow,
  domain: cp14DomainSpec,
  extractionSchemas: cp14ExtractionSchemas,
} as const;

export default cp14Definition;
