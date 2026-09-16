import type { SqlClient } from "./pgvector-memory.js";
import type { PublicationRunStore, StoredPublicationRun } from "./run-store.js";

export const PUBLICATION_RUN_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS publication_runs (
  run_id text PRIMARY KEY,
  publication_id text NOT NULL,
  status text NOT NULL,
  stage text NOT NULL,
  run_json jsonb NOT NULL,
  rendered_json jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publication_runs_publication_idx
  ON publication_runs (publication_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS publication_runs_status_idx
  ON publication_runs (status, updated_at DESC);
`;

function decodeStored(value: unknown): StoredPublicationRun | undefined {
  if (!value) return undefined;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object") return undefined;
  return parsed as StoredPublicationRun;
}

export function createSqlPublicationRunStore(client: SqlClient): PublicationRunStore {
  return {
    async save(value) {
      await client.query(
        `INSERT INTO publication_runs
          (run_id, publication_id, status, stage, run_json, rendered_json, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now())
         ON CONFLICT (run_id) DO UPDATE SET
           publication_id = EXCLUDED.publication_id,
           status = EXCLUDED.status,
           stage = EXCLUDED.stage,
           run_json = EXCLUDED.run_json,
           rendered_json = EXCLUDED.rendered_json,
           updated_at = now()`,
        [
          value.run.id,
          value.run.publicationId,
          value.run.status,
          value.run.stage,
          JSON.stringify(value.run),
          value.rendered ? JSON.stringify(value.rendered) : null,
        ],
      );
    },

    async get(runId) {
      const result = await client.query<{ run_json: unknown; rendered_json: unknown }>(
        `SELECT run_json, rendered_json
           FROM publication_runs
          WHERE run_id = $1
          LIMIT 1`,
        [runId],
      );
      const row = result.rows[0];
      if (!row) return undefined;
      const run = typeof row.run_json === "string" ? JSON.parse(row.run_json) : row.run_json;
      const rendered =
        row.rendered_json == null
          ? undefined
          : typeof row.rendered_json === "string"
            ? JSON.parse(row.rendered_json)
            : row.rendered_json;
      return decodeStored({ run, rendered });
    },
  };
}
