/**
 * A minimal in-memory stand-in for the `@supabase/supabase-js` server client,
 * implementing only the query-builder surface the appeal-mail route handlers
 * actually use: from().select/insert/update, chained .eq(), .order(),
 * .limit(), and the terminal .single()/.maybeSingle() -- plus auth.getUser().
 *
 * This exists so the acceptance engine can run the *real* route handlers
 * (analyze/draft/approve/checkout, the shared fulfillment engine) in-process
 * against isolated, disposable data instead of a live Supabase project --
 * see "Data Isolation" / "Security Requirements" in
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md. It intentionally mirrors
 * real supabase-js semantics where the production code depends on them:
 * `.single()` errors unless exactly one row matches; `.update()` with zero
 * matching rows is *not* an error (it silently updates nothing), matching
 * real Postgres/PostgREST behavior.
 *
 * This is not a general Supabase mock -- it supports exactly the shapes
 * observed in apps/verticals/appeal-mail's platform/supabase-backed routes.
 * Extend the filter/verb surface here if a future vertical's acceptance test
 * needs more (e.g. `.in()`, `.gt()`), rather than hand-rolling another fake.
 */

export interface FakeSupabaseUser {
  id: string;
  email?: string;
}

export interface FakeSupabaseSeed {
  tables?: Record<string, Record<string, unknown>[]>;
  /** Bearer token -> user. requireAuthenticatedUser() looks tokens up here. */
  users?: Record<string, FakeSupabaseUser>;
}

type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq"; val: unknown };

interface Thenable<T> {
  then<R>(onFulfilled: (value: T) => R, onRejected?: (reason: unknown) => R): Promise<R>;
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) => filters.every((f) => row[f.col] === f.val));
}

export class FakeSupabaseClient {
  readonly tables: Record<string, Row[]> = {};
  readonly users: Record<string, FakeSupabaseUser>;
  /** In-memory Storage: "<bucket>/<path>" -> bytes. Mirrors the subset of
   * supabase-js Storage (`.storage.from(bucket).upload()/.download()`) that
   * verticals use to retain evidence bytes for re-attachment at fulfillment
   * time (see mailmypdf-client.ts's uploadPacket()). */
  readonly storageObjects: Map<string, Uint8Array> = new Map();

  constructor(seed: FakeSupabaseSeed = {}) {
    for (const [name, rows] of Object.entries(seed.tables ?? {})) {
      this.tables[name] = rows.map((r) => ({ ...r }));
    }
    this.users = { ...(seed.users ?? {}) };
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (
        path: string,
        body: Uint8Array | ArrayBuffer,
        _options?: { contentType?: string; upsert?: boolean },
      ): Promise<{ data: { path: string } | null; error: Error | null }> => {
        const bytes = body instanceof Uint8Array ? body : new Uint8Array(body);
        this.storageObjects.set(`${bucket}/${path}`, bytes);
        return { data: { path }, error: null };
      },
      download: async (path: string): Promise<{ data: Blob | null; error: Error | null }> => {
        const bytes = this.storageObjects.get(`${bucket}/${path}`);
        if (!bytes) return { data: null, error: new Error(`Object not found: ${bucket}/${path}`) };
        const owned = new Uint8Array(bytes.byteLength);
        owned.set(bytes);
        return { data: new Blob([owned.buffer]), error: null };
      },
    }),
  };

  auth = {
    getUser: async (token: string): Promise<{ data: { user: FakeSupabaseUser | null }; error: Error | null }> => {
      const user = this.users[token];
      if (!user) return { data: { user: null }, error: new Error("Invalid or expired authentication token") };
      return { data: { user }, error: null };
    },
  };

  from(tableName: string) {
    if (!this.tables[tableName]) this.tables[tableName] = [];
    const table = this.tables[tableName];
    const client = this;

    type Mode = "select" | "insert" | "update" | "delete";

    function builder(mode: Mode, payload?: Row) {
      const filters: Filter[] = [];
      let orderCol: string | null = null;
      let orderAscending = true;
      let limitN: number | null = null;

      function matched(): Row[] {
        let result = applyFilters(table, filters);
        if (orderCol) {
          const col = orderCol;
          result = [...result].sort((a, b) => {
            const av = a[col] as any;
            const bv = b[col] as any;
            if (av === bv) return 0;
            const cmp = av > bv ? 1 : -1;
            return orderAscending ? cmp : -cmp;
          });
        }
        if (limitN != null) result = result.slice(0, limitN);
        return result;
      }

      function execute(): { data: unknown; error: Error | null } {
        if (mode === "select") {
          return { data: matched(), error: null };
        }
        if (mode === "insert") {
          const rows = Array.isArray(payload) ? (payload as Row[]) : [payload as Row];
          for (const row of rows) table.push({ ...row });
          return { data: rows, error: null };
        }
        if (mode === "update") {
          const targets = applyFilters(table, filters);
          for (const target of targets) Object.assign(target, payload);
          // Real PostgREST: updating zero matching rows is success, not an error.
          return { data: targets, error: null };
        }
        if (mode === "delete") {
          const targets = new Set(applyFilters(table, filters));
          client.tables[tableName] = table.filter((r) => !targets.has(r));
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }

      const api: any = {
        select(_cols?: string) {
          return api;
        },
        eq(col: string, val: unknown) {
          filters.push({ col, op: "eq", val });
          return api;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderCol = col;
          orderAscending = opts?.ascending !== false;
          return api;
        },
        limit(n: number) {
          limitN = n;
          return api;
        },
        single(): Thenable<{ data: Row | null; error: Error | null }> {
          return {
            then(onFulfilled, onRejected) {
              try {
                const rows = matched();
                if (rows.length === 0) {
                  return Promise.resolve(
                    onFulfilled({ data: null, error: new Error("No rows found (PGRST116)") }),
                  );
                }
                if (rows.length > 1) {
                  return Promise.resolve(
                    onFulfilled({ data: null, error: new Error("Multiple rows returned for .single()") }),
                  );
                }
                return Promise.resolve(onFulfilled({ data: rows[0], error: null }));
              } catch (error) {
                if (onRejected) return Promise.resolve(onRejected(error));
                return Promise.reject(error);
              }
            },
          };
        },
        maybeSingle(): Thenable<{ data: Row | null; error: Error | null }> {
          return {
            then(onFulfilled, onRejected) {
              try {
                const rows = matched();
                if (rows.length > 1) {
                  return Promise.resolve(
                    onFulfilled({ data: null, error: new Error("Multiple rows returned for .maybeSingle()") }),
                  );
                }
                return Promise.resolve(onFulfilled({ data: rows[0] ?? null, error: null }));
              } catch (error) {
                if (onRejected) return Promise.resolve(onRejected(error));
                return Promise.reject(error);
              }
            },
          };
        },
        // Makes the bare chain (e.g. `.update(x).eq(...).eq(...)`) awaitable
        // without an explicit terminal call, matching real supabase-js.
        then(onFulfilled: (v: { data: unknown; error: Error | null }) => any, onRejected?: (e: unknown) => any) {
          try {
            return Promise.resolve(onFulfilled(execute()));
          } catch (error) {
            if (onRejected) return Promise.resolve(onRejected(error));
            return Promise.reject(error);
          }
        },
      };
      return api;
    }

    return {
      select: (cols?: string) => builder("select").select(cols),
      insert: (row: Row | Row[]) => builder("insert", row as Row),
      update: (patch: Row) => builder("update", patch),
      delete: () => builder("delete"),
    };
  }
}

export function createFakeSupabase(seed?: FakeSupabaseSeed): FakeSupabaseClient {
  return new FakeSupabaseClient(seed);
}
