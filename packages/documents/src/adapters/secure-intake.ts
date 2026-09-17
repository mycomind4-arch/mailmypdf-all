import {
  computeRetentionUntil,
  intakeDocumentToQuarantine,
  type SecureDocumentEnvelope,
} from "../index.js";

export interface SecureDocumentUploadInput {
  file: File;
  workflowId: string;
  purpose: string;
  consent: boolean;
}

export interface RegisteredSecureDocument {
  id: string;
  workflowId: string;
  safeFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  securityStatus: string;
  createdAt?: string;
}

export interface SecureDocumentIntakePersistence {
  recordConsent(input: {
    ownerId: string;
    workflowId: string;
    purpose: string;
    consentVersion: string;
    recordedAt: string;
  }): Promise<string>;

  putQuarantineObject(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  removeQuarantineObject(path: string): Promise<void>;

  registerDocument(
    input: SecureDocumentEnvelope & { consentId: string; originalFilename: string },
  ): Promise<RegisteredSecureDocument>;
}

export class SecureDocumentIntakeError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "SecureDocumentIntakeError";
  }
}

/**
 * Shared application adapter around the canonical quarantine intake primitive.
 *
 * The package core remains responsible for consent sequencing, filename/MIME/
 * byte validation, owner-scoped paths, hashing, quarantine status, retention,
 * and cleanup. Deployments only provide storage and registry persistence.
 */
export async function intakeSecureDocument(
  input: SecureDocumentUploadInput,
  context: {
    ownerId: string;
    persistence: SecureDocumentIntakePersistence;
    retentionDays?: number;
  },
): Promise<RegisteredSecureDocument> {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const retentionDays = context.retentionDays ?? 30;
  let registered: RegisteredSecureDocument | null = null;

  try {
    await intakeDocumentToQuarantine(
      {
        ownerId: context.ownerId,
        workflowId: input.workflowId,
        purpose: input.purpose,
        consent: input.consent,
        filename: input.file.name,
        mimeType: input.file.type,
        bytes,
        retentionUntil: computeRetentionUntil(retentionDays),
      },
      {
        consents: {
          recordConsent: (consent) => context.persistence.recordConsent(consent),
        },
        storage: {
          put: (path, data, contentType) =>
            context.persistence.putQuarantineObject(path, data, contentType),
          remove: (path) => context.persistence.removeQuarantineObject(path),
        },
        registry: {
          async register(document) {
            registered = await context.persistence.registerDocument({
              ...document,
              originalFilename: input.file.name,
            });
            return document;
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof SecureDocumentIntakeError) throw error;
    throw new SecureDocumentIntakeError(
      error instanceof Error ? error.message : "Secure document intake failed",
      error,
    );
  }

  if (!registered) throw new SecureDocumentIntakeError("Secure document was not registered");
  return registered;
}
