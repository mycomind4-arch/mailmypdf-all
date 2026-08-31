/* ═══════════════════════════════════════════════════════════
   REPOSITORY PROVIDER
   
   Returns the active CaseRepository implementation.
   
   - If SUPABASE_URL + SUPABASE_ANON_KEY are set → SupabaseCaseRepository
   - In development/test → InMemoryCaseRepository (explicit dev fallback)
   - In production without Supabase → THROWS (no silent fallback)
   
   This prevents data loss: production must never silently store
   cases in ephemeral memory.
   
   Usage:
     import { getRepository } from "@/platform/repository";
     const repo = getRepository();
     const myCase = await repo.load(id, ownerId);
   
   Override for tests:
     import { setRepository } from "@/platform/repository";
     setRepository(new InMemoryCaseRepository());
   ═══════════════════════════════════════════════════════════ */

import type { CaseRepository } from "../domain/case-repository";
import { RepositoryError, RepositoryErrorCode } from "../domain/case-repository";
import { getInMemoryRepository } from "./in-memory-repository";
import { SupabaseCaseRepository } from "./supabase-repository";
import { hasSupabase } from "./supabase-client";

let activeRepo: CaseRepository | null = null;

function isProduction(): boolean {
  const env = typeof process !== "undefined" ? process.env : {};
  return env.NODE_ENV === "production";
}

/**
 * Returns the active case repository.
 * 
 * - Uses Supabase when configured (any environment).
 * - In development/test, falls back to InMemoryCaseRepository.
 * - In production without Supabase configured, THROWS —
 *   production must never silently use ephemeral storage.
 */
export function getRepository(): CaseRepository {
  if (!activeRepo) {
    if (hasSupabase()) {
      activeRepo = new SupabaseCaseRepository();
    } else if (!isProduction()) {
      // Dev/test: explicit in-memory fallback
      activeRepo = getInMemoryRepository();
    } else {
      // Production without Supabase — this is a configuration error
      throw new RepositoryError(
        "No persistent storage configured in production. " +
          "Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables. " +
          "In-memory storage is not available in production — " +
          "cases would be lost on server restart.",
        RepositoryErrorCode.NOT_CONFIGURED,
      );
    }
  }
  return activeRepo;
}

/**
 * Override the repository (used in tests to inject a mock).
 */
export function setRepository(repo: CaseRepository): void {
  activeRepo = repo;
}
