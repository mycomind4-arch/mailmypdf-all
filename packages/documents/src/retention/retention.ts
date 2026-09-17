export interface ClaimedRetentionDocument {
  id: string;
  ownerId: string;
  storagePath: string;
  deletionAttempts: number;
}

export interface SecureDocumentRetentionStore {
  claimExpired(batchSize: number): Promise<readonly ClaimedRetentionDocument[]>;
  removeObject(document: ClaimedRetentionDocument): Promise<void>;
  recordDeletionFailure(documentId: string, message: string): Promise<void>;
  tombstone(input: {
    documentId: string;
    expectedStatus: "deleting";
    deletedAt: string;
    tombstoneStoragePath: string;
  }): Promise<void>;
}

/**
 * Purges expired document bytes and leaves only a sanitized tombstone. Hashes,
 * filenames, MIME metadata, scan output, and storage location are intentionally
 * removed by the persistence adapter when `tombstone` succeeds.
 */
export async function purgeExpiredSecureDocuments(input: {
  store: SecureDocumentRetentionStore;
  batchSize?: number;
  now?: () => string;
}): Promise<{ claimed: number; deleted: number; failed: number }> {
  const batchSize = input.batchSize ?? 50;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("Retention batch size must be between 1 and 100");
  }

  const documents = await input.store.claimExpired(batchSize);
  const result = { claimed: documents.length, deleted: 0, failed: 0 };
  const now = input.now ?? (() => new Date().toISOString());

  for (const document of documents) {
    try {
      await input.store.removeObject(document);
    } catch (error) {
      result.failed += 1;
      await input.store.recordDeletionFailure(
        document.id,
        (error instanceof Error ? error.message : "Storage deletion failed").slice(0, 500),
      );
      continue;
    }

    try {
      await input.store.tombstone({
        documentId: document.id,
        expectedStatus: "deleting",
        deletedAt: now(),
        tombstoneStoragePath: `${document.ownerId}/deleted/${document.id}`,
      });
      result.deleted += 1;
    } catch {
      // Bytes are already gone. Keep the record in a recoverable deleting state
      // so the next job can finish sanitizing metadata without restoring content.
      result.failed += 1;
    }
  }

  return result;
}
