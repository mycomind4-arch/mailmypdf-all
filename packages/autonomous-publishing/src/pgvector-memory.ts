import type { StoryMemory, StoryMemoryMatch } from "./memory.js";
import type { StoryCandidate } from "./types.js";

export interface SqlQueryResult<Row = Record<string, unknown>> {
  rows: readonly Row[];
}

export interface SqlClient {
  query<Row = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<SqlQueryResult<Row>>;
}

export const STORY_MEMORY_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS publication_story_memory (
  publication_story_id text PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL,
  published_at timestamptz NOT NULL,
  embedding vector,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS publication_story_memory_published_at_idx
  ON publication_story_memory (published_at DESC);
`;

function vectorLiteral(values: readonly number[]): string {
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error("Story embedding is invalid");
  }
  return `[${values.join(",")}]`;
}

export function createPgVectorStoryMemory(client: SqlClient): StoryMemory {
  return {
    async findSimilar(story: StoryCandidate, limit = 5): Promise<readonly StoryMemoryMatch[]> {
      if (!story.embedding?.length) {
        const result = await client.query<{ story_id: string; published_at: string }>(
          `SELECT publication_story_id AS story_id, published_at
             FROM publication_story_memory
            WHERE url = $1 OR lower(title) = lower($2)
            ORDER BY published_at DESC
            LIMIT $3`,
          [story.url, story.title, limit],
        );
        return result.rows.map((row) => ({
          storyId: row.story_id,
          similarity: 1,
          publishedAt: row.published_at,
        }));
      }

      const result = await client.query<{ story_id: string; similarity: number; published_at: string }>(
        `SELECT publication_story_id AS story_id,
                1 - (embedding <=> $1::vector) AS similarity,
                published_at
           FROM publication_story_memory
          WHERE embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector
          LIMIT $2`,
        [vectorLiteral(story.embedding), limit],
      );
      return result.rows.map((row) => ({
        storyId: row.story_id,
        similarity: Number(row.similarity),
        publishedAt: row.published_at,
      }));
    },

    async remember(story: StoryCandidate, publishedAt: string): Promise<void> {
      await client.query(
        `INSERT INTO publication_story_memory
          (publication_story_id, url, title, published_at, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)
         ON CONFLICT (publication_story_id) DO UPDATE SET
           url = EXCLUDED.url,
           title = EXCLUDED.title,
           published_at = EXCLUDED.published_at,
           embedding = COALESCE(EXCLUDED.embedding, publication_story_memory.embedding),
           metadata = EXCLUDED.metadata`,
        [
          story.id,
          story.url,
          story.title,
          publishedAt,
          story.embedding?.length ? vectorLiteral(story.embedding) : null,
          JSON.stringify(story.metadata ?? {}),
        ],
      );
    },
  };
}
