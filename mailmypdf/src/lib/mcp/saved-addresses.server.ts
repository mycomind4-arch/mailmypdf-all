import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/secure-core/auth.server";
import { canonicalJSON } from "@/lib/proof-of-service/hashing";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class SavedAddressError extends Error {
  readonly details = undefined;
  constructor(readonly status: number, message: string) { super(message); }
}

const referenceSchema = z.object({ id: z.string().uuid(), revision: z.number().int().positive() }).strict();
const saveSchema = z.object({
  id: z.string().uuid(), expected_revision: z.number().int().min(0),
  kind: z.enum(["sender", "recipient"]), label: z.string().trim().min(1).max(80),
  order_id: z.string().trim().min(1), is_default: z.boolean(),
  user_confirmed: z.literal(true),
}).strict();
const archiveSchema = z.object({ id: z.string().uuid(), expected_revision: z.number().int().positive(), user_confirmed: z.literal(true) }).strict();

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new SavedAddressError(400, "Invalid saved-address request. Explicit confirmation and exact revision are required.");
  return result.data;
}

export async function listSavedAddresses(request: Request, input: unknown) {
  const { kind } = parse(z.object({ kind: z.enum(["sender", "recipient"]) }).strict(), input);
  const { user } = await requireAuthenticatedUser(request);
  const { data, error } = await supabaseAdmin.from("saved_mailing_addresses")
    .select("id,kind,label,address,country,revision,is_default,verification")
    .eq("owner_id", user.id).eq("kind", kind).is("archived_at", null)
    .order("is_default", { ascending: false }).order("label").order("id").limit(101);
  if (error) throw new SavedAddressError(503, "Saved addresses are unavailable. You can still enter addresses manually.");
  return { addresses: (data ?? []).slice(0, 100), truncated: (data?.length ?? 0) > 100,
    nextAction: "Ask the user to select and confirm the exact address, even for a default. Copy its address and id/revision into preparation. Verification must be refreshed for each new mailing; saved verification is historical, not send approval." };
}

export async function saveAddress(request: Request, input: unknown) {
  const args = parse(saveSchema, input);
  if (args.kind !== "sender" && args.is_default) throw new SavedAddressError(400, "Only sender profiles can be default.");
  const { user } = await requireAuthenticatedUser(request);
  // Evidence is read from an owned, freshly verified order, never supplied by chat.
  const { verifiedAddressForSaving } = await import("./direct-mail.server");
  const verified = await verifiedAddressForSaving(request, args.order_id, args.kind);
  const { data, error } = await supabaseAdmin.rpc("write_saved_mailing_address", {
    p_owner: user.id, p_id: args.id, p_revision: args.expected_revision,
    p_kind: args.kind, p_label: args.label, p_address: verified.address,
    p_verification: verified.verification, p_default: args.is_default, p_archive: false,
  }).single();
  if (error) throw new SavedAddressError(error.code === "40001" || error.code === "42501" ? 409 : 503,
    "Address could not be saved. Reload saved addresses before retrying; do not change the id for an uncertain save.");
  if (data?.id !== args.id) throw new SavedAddressError(503, "Save outcome is uncertain. Reload saved addresses before retrying with the same id.");
  return { address: data, nextAction: "Saved for reuse only. This did not change, approve, pay for, or send any mailing." };
}

export async function archiveAddress(request: Request, input: unknown) {
  const args = parse(archiveSchema, input);
  const { user } = await requireAuthenticatedUser(request);
  const { data, error } = await supabaseAdmin.rpc("write_saved_mailing_address", {
    p_owner: user.id, p_id: args.id, p_revision: args.expected_revision,
    p_kind: "sender", p_label: "", p_address: {}, p_verification: {}, p_default: false, p_archive: true,
  }).single();
  if (error) throw new SavedAddressError(error.code === "40001" || error.code === "42501" ? 409 : 503,
    "Address could not be archived. Reload saved addresses before retrying.");
  if (data?.id !== args.id || !data.archived_at) throw new SavedAddressError(503, "Archive outcome is uncertain. Reload saved addresses before retrying.");
  return { id: data?.id, archived: true, nextAction: "Hidden from saved-address selection. Existing mailing snapshots are unchanged." };
}

export async function requireSavedAddressSnapshot(ownerId: string, kind: "sender" | "recipient", raw: unknown, address: unknown) {
  if (raw === undefined) return null;
  const reference = parse(referenceSchema, raw);
  const { data, error } = await supabaseAdmin.from("saved_mailing_addresses").select("id,revision,address,verification")
    .eq("owner_id", ownerId).eq("kind", kind).eq("id", reference.id).is("archived_at", null).maybeSingle();
  if (error) throw new SavedAddressError(503, "Saved address could not be checked.");
  if (!data || data.revision !== reference.revision || canonicalJSON(data.address) !== canonicalJSON(address)) {
    throw new SavedAddressError(409, "Saved address changed or is unavailable. Reload and ask the user to confirm the current address.");
  }
  return { id: data.id, revision: data.revision, verification: data.verification };
}
