import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createPublishingPipeline } from "./pipeline.js";
import { createDefaultPublishingAdapters } from "./runtime.js";
import { validatePublicationManifest, type PublicationManifest } from "./manifest.js";

function manifestFromModule(module: Record<string, unknown>): PublicationManifest {
  for (const value of Object.values(module)) {
    if (value && typeof value === "object" && "id" in value && "editorial" in value && "ai" in value) {
      return validatePublicationManifest(value as PublicationManifest);
    }
  }
  throw new Error("No PublicationManifest export found");
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Usage: pnpm --filter @mailmypdf/autonomous-publishing preview <publication.config.ts>");
  }

  const absolute = path.resolve(process.cwd(), input);
  const module = await import(pathToFileURL(absolute).href);
  const manifest = manifestFromModule(module);
  const adapters = createDefaultPublishingAdapters(manifest);
  const pipeline = createPublishingPipeline(adapters);
  const result = await pipeline.run(manifest, false);

  const outDir = path.resolve(process.cwd(), "Projects", "Publications", manifest.id, "editions", result.rendered.edition.editionId);
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outDir, "edition.md"), result.rendered.text, "utf8"),
    writeFile(path.join(outDir, "edition.html"), result.rendered.html, "utf8"),
    writeFile(path.join(outDir, "run.json"), JSON.stringify(result.run, null, 2), "utf8"),
    writeFile(path.join(outDir, "edition.json"), JSON.stringify(result.rendered.edition, null, 2), "utf8"),
  ]);

  process.stdout.write(JSON.stringify({
    status: result.run.status,
    publicationId: manifest.id,
    editionId: result.rendered.edition.editionId,
    output: outDir,
  }, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write((error instanceof Error ? error.stack ?? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
