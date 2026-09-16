import type { PublicationManifest } from "../../packages/autonomous-publishing/src/index.js";
import { aiIndustryDaily } from "./ai-industry-daily/publication.config.js";

export interface PublicationCatalogEntry {
  manifest: PublicationManifest;
  projectPath: string;
  status: "draft" | "testing" | "active" | "paused";
}

export const publicationCatalog: readonly PublicationCatalogEntry[] = [
  {
    manifest: aiIndustryDaily,
    projectPath: "Projects/Publications/ai-industry-daily",
    status: "testing",
  },
];

export function getPublication(publicationId: string): PublicationCatalogEntry {
  const publication = publicationCatalog.find((entry) => entry.manifest.id === publicationId);
  if (!publication) throw new Error(`Unknown publication: ${publicationId}`);
  return publication;
}
