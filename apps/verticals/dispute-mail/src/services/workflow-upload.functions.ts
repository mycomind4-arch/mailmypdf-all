import { createServerFn } from "@tanstack/react-start";
import { uploadDocument } from "@/platform/mailmypdf";

export const uploadWorkflowDocument = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: FormData }) => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("A document file is required");
    if (file.size <= 0) throw new Error("The document is empty");
    if (file.size > 15 * 1024 * 1024) throw new Error("The document exceeds the 15 MB upload limit");

    const allowed = new Set([
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ]);
    if (!allowed.has(file.type)) throw new Error(`Unsupported document type: ${file.type || "unknown"}`);

    const document = await uploadDocument(file);
    return {
      documentId: document.id,
      filename: document.filename,
      mimeType: document.mime_type,
      sha256: document.sha256,
      sizeBytes: document.size_bytes,
      source: document.source,
    };
  });
