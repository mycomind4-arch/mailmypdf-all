/**
 * PostgREST embedded-resource access.
 *
 * supabase-js cannot infer the cardinality of an embedded resource, so a
 * many-to-one relation like `proof_tenants!inner (...)` types as an array even
 * though the API returns a single object. Casting past that hides which shape
 * actually arrived; this reads either one correctly.
 */
export function embeddedOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
