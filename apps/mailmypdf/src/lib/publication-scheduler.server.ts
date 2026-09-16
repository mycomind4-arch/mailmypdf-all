import { publicationCatalog } from "../../../../Projects/Publications/catalog";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runPublicationPreview } from "@/lib/publication-runtime.server";

type ScheduleParts = {
  date: string;
  hour: number;
  minute: number;
};

function localParts(now: Date, timezone: string): ScheduleParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function scheduleKey(
  manifest: (typeof publicationCatalog)[number]["manifest"],
  now: Date,
): string | null {
  if (manifest.schedule.frequency === "manual" || manifest.schedule.frequency === "weekly") {
    return null;
  }
  const local = localParts(now, manifest.schedule.timezone);

  if (manifest.schedule.frequency === "hourly") {
    return `${local.date}T${String(local.hour).padStart(2, "0")}`;
  }

  const [targetHour, targetMinute] = (manifest.schedule.time ?? "00:00")
    .split(":")
    .map(Number);
  const localMinutes = local.hour * 60 + local.minute;
  const targetMinutes = (targetHour || 0) * 60 + (targetMinute || 0);
  if (localMinutes < targetMinutes) return null;
  return local.date;
}

async function claimSchedule(publicationId: string, key: string): Promise<boolean> {
  const { error } = await (supabaseAdmin as any)
    .from("publication_schedule_claims")
    .insert({
      publication_id: publicationId,
      schedule_key: key,
      status: "claimed",
    });

  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(error.message);
}

async function finishClaim(
  publicationId: string,
  key: string,
  result: { runId?: string; error?: string },
) {
  const now = new Date().toISOString();
  const { error } = await (supabaseAdmin as any)
    .from("publication_schedule_claims")
    .update({
      status: result.error ? "failed" : "completed",
      run_id: result.runId ?? null,
      error: result.error ?? null,
      completed_at: now,
    })
    .eq("publication_id", publicationId)
    .eq("schedule_key", key);
  if (error) throw new Error(error.message);
}

export async function runDuePublications(now = new Date()) {
  const results: Array<{
    publicationId: string;
    scheduleKey?: string;
    status: "skipped" | "started" | "failed";
    runId?: string;
    reason?: string;
  }> = [];

  for (const entry of publicationCatalog) {
    const { manifest, status } = entry;

    if (status !== "active") {
      results.push({ publicationId: manifest.id, status: "skipped", reason: `publication_${status}` });
      continue;
    }

    if (!process.env[manifest.ai.apiKeyEnv]?.trim()) {
      results.push({ publicationId: manifest.id, status: "skipped", reason: "ai_not_configured" });
      continue;
    }

    const key = scheduleKey(manifest, now);
    if (!key) {
      results.push({ publicationId: manifest.id, status: "skipped", reason: "not_due" });
      continue;
    }

    const claimed = await claimSchedule(manifest.id, key);
    if (!claimed) {
      results.push({ publicationId: manifest.id, scheduleKey: key, status: "skipped", reason: "already_claimed" });
      continue;
    }

    try {
      const preview = await runPublicationPreview(manifest.id);
      await finishClaim(manifest.id, key, { runId: preview.run.id });
      results.push({
        publicationId: manifest.id,
        scheduleKey: key,
        status: "started",
        runId: preview.run.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await finishClaim(manifest.id, key, { error: message });
      results.push({
        publicationId: manifest.id,
        scheduleKey: key,
        status: "failed",
        reason: message,
      });
    }
  }

  return results;
}
