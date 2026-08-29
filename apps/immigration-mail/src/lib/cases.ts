/**
 * Case management — create, list, and manage immigration cases.
 * Each case is a workspace for documents, correspondence, and mailings.
 */
import { supabase } from "./supabase";

export interface Case { id: string; user_id: string; name: string; applicant_name?: string; petitioner_name?: string; receipt_number?: string; category?: string; agency?: string; status: string; notes?: string; created_at: string; updated_at: string; }
export interface MailingOrder { id: string; case_id?: string; user_id: string; correspondence_id?: string; workflow_id: string; recipient_name: string; recipient_org?: string; recipient_address1: string; recipient_address2?: string; recipient_city: string; recipient_state: string; recipient_zip: string; mail_method: string; price_cents: number; status: string; tracking_number?: string; created_at: string; updated_at: string; }
export interface Correspondence { id: string; case_id?: string; user_id: string; workflow_id: string; title: string; draft_content: string; status: string; created_at: string; updated_at: string; }

export async function fetchCases(userId: string): Promise<{ data: Case[] | null; error: string | null }> {
  const { data, error } = await supabase.from("cases").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as Case[], error: null };
}

export async function createCase(userId: string, caseData: Partial<Case>): Promise<{ data: Case | null; error: string | null }> {
  const { data, error } = await supabase.from("cases").insert({ user_id: userId, name: caseData.name || "Untitled case", applicant_name: caseData.applicant_name, petitioner_name: caseData.petitioner_name, receipt_number: caseData.receipt_number, category: caseData.category, agency: caseData.agency, status: "active", notes: caseData.notes }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Case, error: null };
}

export async function updateCase(caseId: string, updates: Partial<Case>): Promise<{ error: string | null }> {
  const { error } = await supabase.from("cases").update(updates).eq("id", caseId);
  return { error: error?.message ?? null };
}

export async function fetchMailingOrders(userId: string): Promise<{ data: MailingOrder[] | null; error: string | null }> {
  const { data, error } = await supabase.from("mailing_orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as MailingOrder[], error: null };
}

export async function fetchCorrespondence(userId: string): Promise<{ data: Correspondence[] | null; error: string | null }> {
  const { data, error } = await supabase.from("case_correspondence").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as Correspondence[], error: null };
}

export async function saveCorrespondence(userId: string, data: { case_id?: string; workflow_id: string; title: string; draft_content: string; status?: string }): Promise<{ data: Correspondence | null; error: string | null }> {
  const { data: result, error } = await supabase.from("case_correspondence").insert({ user_id: userId, case_id: data.case_id || null, workflow_id: data.workflow_id, title: data.title, draft_content: data.draft_content, status: data.status || "draft" }).select().single();
  if (error) return { data: null, error: error.message };
  return { data: result as Correspondence, error: null };
}

/**
 * Starts the authenticated Stripe Checkout flow for a saved correspondence.
 * Physical fulfillment occurs only after Stripe payment is verified server-side.
 */
export async function createMailingOrder(userId: string, data: {
  case_id?: string;
  correspondence_id?: string;
  workflow_id: string;
  recipient_name: string;
  recipient_org?: string;
  recipient_address1: string;
  recipient_address2?: string;
  recipient_city: string;
  recipient_state: string;
  recipient_zip: string;
  mail_method: string;
  price_cents: number;
}): Promise<{ data: MailingOrder | null; error: string | null }> {
  if (!userId || !data.correspondence_id) return { data: null, error: "checkout_requires_authenticated_correspondence" };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) return { data: null, error: "Your MailMyPDF Account session expired. Please sign in again." };

  const { data: correspondence, error: correspondenceError } = await supabase
    .from("case_correspondence")
    .select("draft_content, workflow_id")
    .eq("id", data.correspondence_id)
    .eq("user_id", userId)
    .single();
  if (correspondenceError || !correspondence) return { data: null, error: "Correspondence was not found or is not owned by this account." };

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        workflowId: data.workflow_id,
        workflowTitle: "Immigration Mail",
        correspondenceId: data.correspondence_id,
        draftContent: correspondence.draft_content,
        mailingMethod: data.mail_method,
        recipient: {
          name: data.recipient_name,
          org: data.recipient_org || "",
          address1: data.recipient_address1,
          address2: data.recipient_address2 || "",
          city: data.recipient_city,
          state: data.recipient_state,
          zip: data.recipient_zip,
        },
        matterReference: data.workflow_id,
        matterType: "immigration-mail",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.checkoutUrl) return { data: null, error: payload?.error || `Unable to start secure checkout (${response.status}).` };
    window.location.assign(payload.checkoutUrl);
    return { data: null, error: "checkout_redirect_started" };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unable to start secure checkout." };
  }
}

export function formatPrice(cents: number): string { return `$${(cents / 100).toFixed(2)}`; }
export function formatMailMethod(method: string): string { return method.charAt(0).toUpperCase() + method.slice(1); }
export function formatDate(iso: string): string {
  try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}
