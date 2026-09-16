import { ExtractionSchemaRegistry } from "@mailmypdf/document-intelligence";
import {
  certifyWorkflowCapabilities,
  certifyWorkflowDomain,
  defineWorkflow,
} from "@mailmypdf/workflows";
import cp2000DomainSpec from "./domain";
import cp2000ExtractionSchema from "./extraction-schema";
import cp2000Manifest from "./manifest";

export const cp2000Workflow = defineWorkflow(cp2000Manifest);

export const cp2000ExtractionSchemas = new ExtractionSchemaRegistry()
  .register(cp2000ExtractionSchema);

export function certifyCp2000Definition(
  now: string | Date = new Date(),
) {
  for (const schemaId of cp2000DomainSpec.extractionSchemaIds) {
    cp2000ExtractionSchemas.get(schemaId);
  }

  const capabilities = certifyWorkflowCapabilities(cp2000Manifest);
  const domain = certifyWorkflowDomain(
    cp2000Manifest,
    cp2000DomainSpec,
    now,
  );

  return {
    workflowId: cp2000Manifest.id,
    capabilities,
    domain,
    ready:
      capabilities.productionReady &&
      domain.ready,
  };
}

export const cp2000Definition = {
  manifest: cp2000Manifest,
  workflow: cp2000Workflow,
  domain: cp2000DomainSpec,
  extractionSchemas: cp2000ExtractionSchemas,
} as const;

export default cp2000Definition;
