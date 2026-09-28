import { PACKET_REVIEW_RESOURCE_URI } from "./ui-resource-ids";
import {
  assessConnectorCapabilities,
  connectorCapabilityVersion,
  isCapabilityVersionCompatible,
  isRegisteredConnectorCapability,
  type CapabilityId,
  type ConnectorCapabilityAssessment,
  type ConnectorCapabilityContext,
  type ConnectorCapabilityRequirement,
} from "@mailmypdf/workflows/connector-readiness";

export const MCP_CONNECTOR_VERSION = "0.10.0";
export const MCP_CONNECTOR_CONTRACT_VERSION = "mailmypdf.connector/v2";
export const MCP_PROTOCOL_VERSION = "2026-07-28";

/**
 * Supabase Auth currently supports the standard OAuth/OIDC scopes below.
 * Fine-grained MailMyPDF authorization stays server-side through RLS, matter
 * ownership, workflow policy, and exact packet approval rather than inventing
 * OAuth scopes the authorization server cannot issue.
 */
export const MCP_OAUTH_SCOPES = ["email", "profile"] as const;

type JsonSchema = Readonly<Record<string, unknown>>;

export type MailMyPdfMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint?: boolean;
    openWorldHint: boolean;
  };
  securitySchemes: readonly (
    | { type: "noauth" }
    | { type: "oauth2"; scopes: readonly string[] }
  )[];
  capabilityRequirements: readonly ConnectorCapabilityRequirement[];
  _meta?: Readonly<Record<string, unknown>>;
};

const objectSchema = (
  properties: Record<string, unknown>,
  required: readonly string[] = [],
): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const string = (description: string): JsonSchema => ({ type: "string", description });
const integer = (description: string): JsonSchema => ({ type: "integer", description, minimum: 0 });
const idempotencyKeySchema = {
  type: "string",
  minLength: 8,
  maxLength: 128,
  pattern: "^[A-Za-z0-9._:-]+$",
  description:
    "Stable client-generated retry key. Reuse only for the same tool and matter; use a new key for a new attempt.",
} as const;

const oauth = (...scopes: string[]) => [{ type: "oauth2" as const, scopes }] as const;
const noauth = [{ type: "noauth" as const }] as const;
const capabilityRequirement = (
  id: CapabilityId,
  overrides: Partial<ConnectorCapabilityRequirement> = {},
): ConnectorCapabilityRequirement => ({
  id,
  required: true,
  version: "^1.0.0",
  ...overrides,
});
const capabilities = (...ids: CapabilityId[]): readonly ConnectorCapabilityRequirement[] =>
  ids.map((id) => capabilityRequirement(id));
const accountCapabilities = (...ids: CapabilityId[]): readonly ConnectorCapabilityRequirement[] =>
  ids.map((id) => capabilityRequirement(id, { requiresOwnership: false }));

const addressSchema = objectSchema(
  {
    name: string("Recipient or sender name."),
    line1: string("Street address or PO box."),
    line2: { type: ["string", "null"], description: "Optional second address line." },
    city: string("City."),
    state: string("Two-letter US state abbreviation."),
    postal: string("ZIP or ZIP+4."),
  },
  ["name", "line1", "city", "state", "postal"],
);

const mailClassSchema = {
  type: "string",
  enum: ["standard", "certified", "registered"],
  description: "Requested mailing class.",
} as const;

const assistantFileSchema = objectSchema(
  {
    download_url: string("Temporary HTTPS download URL supplied by the AI client."),
    file_id: string("Provider file id for provenance and retry handling."),
    mime_type: { type: "string", description: "Optional provider-reported MIME type." },
    file_name: { type: "string", description: "Optional original filename." },
  },
  ["download_url", "file_id"],
);


export const MAILMYPDF_MCP_TOOLS: readonly MailMyPdfMcpTool[] = [
  {
    name: "find_workflow",
    title: "Find a MailMyPDF workflow",
    description:
      "Find MailMyPDF workflows that match the user's document problem. Use this before creating a matter when the workflow id is not already known.",
    inputSchema: objectSchema(
      {
        query: string("Plain-language description, notice name, agency, or workflow topic."),
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
      ["query"],
    ),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: noauth,
    capabilityRequirements: [],
  },
  {
    name: "get_workflow",
    title: "Get workflow details",
    description:
      "Get the canonical MailMyPDF section, URLs, and chat-execution certification for one workflow id. Create an MCP matter only when chatExecution.certified is true.",
    inputSchema: objectSchema({ workflow_id: string("Canonical workflow id/slug.") }, ["workflow_id"]),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: noauth,
    capabilityRequirements: [],
  },
  {
    name: "get_profile",
    title: "Get connected MailMyPDF profile",
    description:
      "Return the MailMyPDF account currently connected to this MCP request. Use to confirm which account owns new matters and documents.",
    inputSchema: objectSchema({}),
    outputSchema: objectSchema(
      {
        id: string("Stable MailMyPDF profile identifier for the connected account."),
        name: { type: ["string", "null"], description: "Display name for the connected account." },
        email: { type: ["string", "null"], description: "Email address for the connected account." },
      },
      ["id"],
    ),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
    _meta: { "openai/profile": true },
  },
  {
    name: "get_payment_readiness",
    title: "Get saved-payment readiness",
    description:
      "Read whether the connected MailMyPDF account has a tokenized payment method ready for a future explicitly approved mailing. Returns only a safe card display summary and MailMyPDF setup URL; it never returns Stripe customer/payment-method identifiers and never charges anything.",
    inputSchema: objectSchema({}),
    outputSchema: objectSchema(
      {
        accountReady: { type: "boolean", description: "Whether the MailMyPDF account is authenticated and usable." },
        payment: {
          type: "object",
          additionalProperties: false,
          properties: {
            ready: { type: "boolean" },
            display: { type: ["string", "null"] },
            brand: { type: ["string", "null"] },
            last4: { type: ["string", "null"] },
          },
          required: ["ready", "display", "brand", "last4"],
        },
        setupUrl: string("MailMyPDF account page for optional one-time saved-payment setup."),
        chargingAuthorized: { type: "boolean", const: false },
        note: string("Safety guidance explaining that saved payment does not authorize a charge."),
      },
      ["accountReady", "payment", "setupUrl", "chargingAuthorized", "note"],
    ),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: [
      ...accountCapabilities("identity"),
      capabilityRequirement("savedPayment", { requiresApproval: false }),
    ],
  },
  {
    name: "create_matter",
    title: "Create a MailMyPDF matter",
    description:
      "Create an owner-scoped matter for a workflow that get_workflow reports as chatExecution.certified. The server rechecks certification before creation. This does not generate, approve, pay for, or mail anything.",
    inputSchema: objectSchema(
      {
        workflow_id: string("Canonical workflow id returned by find_workflow/get_workflow."),
        section_id: string("Canonical root section id, such as notice-respond or records-request."),
      },
      ["workflow_id", "section_id"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity", "matterState"),
  },
  {
    name: "list_recent_matters",
    title: "List recent MailMyPDF matters",
    description:
      "List the connected account's most recently updated matters so a conversation can safely resume work without asking the user to find an internal matter id.",
    inputSchema: objectSchema({
      limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
    }),
    outputSchema: objectSchema(
      {
        matters: {
          type: "array",
          items: objectSchema(
            {
              matterId: string("Owner-scoped MailMyPDF matter id."),
              workflowId: string("Canonical workflow id."),
              sectionId: string("Canonical workflow section id."),
              status: string("Persisted matter lifecycle status."),
              createdAt: string("ISO creation timestamp."),
              updatedAt: string("ISO last-updated timestamp."),
            },
            ["matterId", "workflowId", "sectionId", "status", "createdAt", "updatedAt"],
          ),
        },
      },
      ["matters"],
    ),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity", "matterState"),
  },
  {
    name: "get_matter",
    title: "Get matter state",
    description:
      "Load an owner-scoped MailMyPDF matter, attached document metadata, completion progress, missing facts reported by analysis, and one conservative next tool recommendation.",
    inputSchema: objectSchema({ matter_id: string("MailMyPDF matter id.") }, ["matter_id"]),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "matterState"),
  },
  {
    name: "get_workflow_state",
    title: "Get workflow state and next actions",
    description:
      "Load the canonical owner-scoped matter state and return MailMyPDF workflow progress, blockers, and typed next safe connector actions. Use this after creating a matter and after each meaningful workflow action instead of guessing the next step.",
    inputSchema: objectSchema(
      { matter_id: string("MailMyPDF matter id.") },
      ["matter_id"],
    ),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "matterState"),
    _meta: {
      "mailmypdf/workflowProtocol": "mailmypdf.workflow/v1",
    },
  },
  {
    name: "get_order_status",
    title: "Get mailing order status",
    description:
      "Read persisted state for the connected user's MailMyPDF order. For direct or conversational mail drafts, the response also derives review/approval continuity and the safest existing next tool from immutable order events. For paid or submitted orders, it returns payment, mailing, provider reference, tracking, and sanitized event history. Supply an order_id or matter_id. This tool is read-only and never polls or mutates the mail provider.",
    inputSchema: objectSchema({
      order_id: {
        type: "string",
        description: "Optional MailMyPDF order id. Supply this or matter_id.",
      },
      matter_id: {
        type: "string",
        description: "Optional owner-scoped workflow matter id. Supply this or order_id.",
      },
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "tracking", "proofAudit"),
  },
  {
    name: "get_document_status",
    title: "Get secure document readiness",
    description:
      "Read the security/readiness state of a MailMyPDF secure document. Supply document_id; include matter_id when the document belongs to a workflow matter. Use after ingest_document or ingest_direct_pdf before analysis or direct mailing. This tool never downloads the stored file and does not expose storage or scanner internals.",
    inputSchema: objectSchema(
      {
        matter_id: {
          type: "string",
          description: "Optional owner-scoped workflow matter id. Omit for a standalone direct-mail PDF.",
        },
        document_id: string("MailMyPDF secure document id returned by an ingestion tool."),
      },
      ["document_id"],
    ),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "matterState", "documentStorage", "documentScanning"),
  },
  {
    name: "get_operation_status",
    title: "Get connector operation status",
    description:
      "Read one durable owner-scoped connector operation. Use after a timeout or interrupted call to recover its result without repeating the action.",
    inputSchema: objectSchema(
      { operation_id: string("Connector operation id returned by an idempotent MailMyPDF tool.") },
      ["operation_id"],
    ),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity", "matterState"),
  },
  {
    name: "get_connector_readiness",
    title: "Check live connector readiness",
    description:
      "Check capability, ownership, approval, and live runtime binding health for another MailMyPDF tool without performing that tool's action.",
    inputSchema: objectSchema(
      {
        tool_name: string("MailMyPDF tool name to assess."),
        matter_id: {
          type: "string",
          description: "Owner-scoped matter id when the target tool operates on a matter.",
        },
      },
      ["tool_name"],
    ),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
  },
  {
    name: "ingest_direct_pdf",
    title: "Securely ingest a PDF for direct mailing",
    description:
      "Copy a user-authorized PDF attachment into MailMyPDF quarantine storage for direct physical mailing without a specialized workflow. The PDF must clear security scanning before an order can be prepared. This tool does not approve, charge, or mail anything.",
    inputSchema: objectSchema(
      {
        file: assistantFileSchema,
        processing_consent: {
          type: "boolean",
          const: true,
          description: "Must be true only after the user explicitly asks MailMyPDF to process this PDF.",
        },
      },
      ["file", "processing_consent"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    _meta: {
      "openai/fileParams": ["file"],
      "openai/toolInvocation/invoking": "Securing PDF…",
      "openai/toolInvocation/invoked": "PDF quarantined",
    },
    capabilityRequirements: accountCapabilities("identity", "secureUpload", "documentStorage", "documentScanning"),
  },
  {
    name: "prepare_conversational_letter",
    title: "Prepare a conversational letter",
    description:
      "Render the exact finalized letter text from chat into a MailMyPDF PDF and create or reuse an unpaid draft order with the confirmed sender, recipient, mail class, and color choice. Use for ordinary letters that do not require a specialized certified workflow. Call review_direct_pdf_mail next to verify addresses and show the exact PDF and envelope. This does not approve, charge, or mail.",
    inputSchema: objectSchema(
      {
        letter_text: {
          type: "string",
          minLength: 1,
          maxLength: 30000,
          description:
            "Exact finalized letter body text the user has reviewed in chat. Preserve wording and line breaks; any change requires a new preparation/review.",
        },
        sender: addressSchema,
        recipient: addressSchema,
        sender_profile: objectSchema(
          { id: string("Selected saved sender UUID."), revision: integer("Exact selected revision.") },
          ["id", "revision"],
        ),
        recipient_entry: objectSchema(
          { id: string("Selected saved recipient UUID."), revision: integer("Exact selected revision.") },
          ["id", "revision"],
        ),
        mail_class: mailClassSchema,
        color: { type: "boolean", default: false, description: "Print in color when true." },
        idempotency_key: string(
          "Stable 8-128 character key for retries of this exact letter and mailing intent. Use a new key after changing the text, addresses, service, or color.",
        ),
      },
      ["letter_text", "sender", "recipient", "mail_class", "idempotency_key"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "documentStorage", "pricing"),
  },
  {
    name: "prepare_direct_pdf_mail",
    title: "Prepare a direct PDF mailing",
    description:
      "Create or reuse an unpaid MailMyPDF draft order from a clean owner-scoped PDF, sender, recipient, mail class, and color choice. Returns the exact PDF SHA-256 and current price for user review. It does not approve, charge, or mail.",
    inputSchema: objectSchema(
      {
        document_id: string("Clean secure document id returned by ingest_direct_pdf."),
        sender: addressSchema,
        recipient: addressSchema,
        sender_profile: objectSchema({ id: string("Selected saved sender UUID."), revision: integer("Exact selected revision.") }, ["id", "revision"]),
        recipient_entry: objectSchema({ id: string("Selected saved recipient UUID."), revision: integer("Exact selected revision.") }, ["id", "revision"]),
        mail_class: mailClassSchema,
        color: { type: "boolean", default: false, description: "Print in color when true." },
        idempotency_key: string("Stable 8-128 character key for retries of this one mailing intent. Use a new key for an intentional duplicate mailing."),
      },
      ["document_id", "sender", "recipient", "mail_class", "idempotency_key"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "documentStorage", "documentScanning", "pricing", "addressVerification"),
  },
  {
    name: "list_saved_addresses",
    title: "List my saved senders or recipients",
    description: "List up to 100 private saved sender profiles or recipient entries. Ask the user to select the exact address; a default is not send approval. Historical verification must be refreshed for a new mailing. Not public autocomplete or a business directory.",
    inputSchema: objectSchema({ kind: { type: "string", enum: ["sender", "recipient"] } }, ["kind"]),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
  },
  {
    name: "save_mailing_address",
    title: "Save a reviewed sender or recipient",
    description: "Only after explicit user consent, save the chosen sender or recipient from an owned mailing with fresh successful address review. Never save billing or account metadata automatically. Use a stable UUID and expected_revision 0 for creation; use the listed id/revision for an edit. Retries keep the same id. A default is allowed only for senders. This never changes existing orders or sends mail.",
    inputSchema: objectSchema({
      id: string("Stable UUID for this saved address; reuse on retries."),
      expected_revision: integer("0 for a new address, exact listed revision for an update."),
      kind: { type: "string", enum: ["sender", "recipient"] },
      label: string("User-chosen label, 1-80 characters, such as Business or Sarah."),
      order_id: string("Owned order reviewed successfully with review_direct_pdf_mail."),
      is_default: { type: "boolean" }, user_confirmed: { type: "boolean", const: true },
    }, ["id", "expected_revision", "kind", "label", "order_id", "is_default", "user_confirmed"]),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
  },
  {
    name: "archive_mailing_address",
    title: "Archive a saved address",
    description: "After explicit user confirmation, hide an owned sender profile or recipient from selection. Requires its exact current revision. Clears its default if set. Does not erase historical mailing snapshots or send mail.",
    inputSchema: objectSchema({ id: string("Saved address UUID."), expected_revision: integer("Exact listed revision."), user_confirmed: { type: "boolean", const: true } }, ["id", "expected_revision", "user_confirmed"]),
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
  },
  {
    name: "get_mailing_context",
    title: "Find my recent mailing addresses",
    description: "Return up to ten recent direct-mail orders belonging to the connected account, including source type, recipient and return addresses, and the read-only tool to use for resume. Use for 'continue my letter', 'same recipient as last time', or a previous return address. Never guess between candidates; ask the user to select, then call get_order_status for exact review/approval continuity. This is not public address search or a saved-profile directory.",
    inputSchema: objectSchema({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: accountCapabilities("identity"),
  },
  {
    name: "review_direct_pdf_mail",
    title: "Review this mailing before payment",
    description: "Verify both postal addresses, save verification evidence, and return a structured draft with exact PDF resource, illustrative envelope layout, price, service, color, and delivery caveat. Postal verification can incur provider usage. Corrections, missing units, or unavailable verification block approval. Never send mail or charge a customer from this tool.",
    inputSchema: objectSchema({ order_id: string("Owned unpaid direct-mail draft order id.") }, ["order_id"]),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "documentStorage", "pricing", "addressVerification"),
    _meta: { ui: { resourceUri: PACKET_REVIEW_RESOURCE_URI }, "openai/outputTemplate": PACKET_REVIEW_RESOURCE_URI },
  },
  {
    name: "approve_direct_pdf_mail",
    title: "Approve exact direct PDF mailing",
    description:
      "Record explicit user approval of the exact direct-mail PDF hash, quoted price, sender, recipient, mail class, and color settings. The PDF may come from an uploaded document or prepare_conversational_letter. Call only after review_direct_pdf_mail verifies both addresses and the user explicitly approves the displayed details. Expired verification requires a fresh review. This does not pay or send mail.",
    inputSchema: objectSchema(
      {
        order_id: string("MailMyPDF direct-mail order id."),
        expected_packet_sha256: string("Exact PDF SHA-256 returned by prepare_direct_pdf_mail or prepare_conversational_letter."),
        expected_total_cents: integer("Exact total price in cents returned by prepare_direct_pdf_mail."),
        expected_sender: addressSchema,
        expected_recipient: addressSchema,
        expected_mail_class: mailClassSchema,
        expected_color: { type: "boolean", description: "Exact color setting returned by prepare_direct_pdf_mail." },
      },
      [
        "order_id",
        "expected_packet_sha256",
        "expected_total_cents",
        "expected_sender",
        "expected_recipient",
        "expected_mail_class",
        "expected_color",
      ],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: [
      ...capabilities("humanReview", "blockingGate"),
      capabilityRequirement("approval", { requiresApproval: false }),
    ],
  },
  {
    name: "prepare_direct_pdf_checkout",
    title: "Prepare checkout for approved direct PDF mailing",
    description:
      "Create or reuse a Stripe-hosted checkout URL for an already approved direct-mail PDF. The server re-verifies the immutable mailing snapshot, PDF hash, and price before creating checkout. Raw card data never passes through MCP.",
    inputSchema: objectSchema(
      {
        order_id: string("Approved MailMyPDF direct-mail order id."),
      },
      ["order_id"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: [
      ...capabilities("pricing", "approval"),
      capabilityRequirement("payment", { requiresApproval: false }),
    ],
  },
  {
    name: "ingest_document",
    title: "Securely ingest an attached document",
    description:
      "Copy a user-authorized assistant attachment into MailMyPDF quarantine storage and attach it to an owner-scoped matter. Use only when the user has explicitly asked MailMyPDF to process that file. The document remains untrusted until MailMyPDF scanning marks it clean; this tool does not analyze, approve, pay for, or mail anything.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id that should own the document."),
        idempotency_key: idempotencyKeySchema,
        file: assistantFileSchema,
        source_kind: {
          type: "string",
          enum: ["local_upload", "conversation_attachment", "google_drive", "mailmypdf_library", "external_provider"],
          default: "conversation_attachment",
          description:
            "Optional origin classification for provenance only. The actual file bytes still arrive through the secure file parameter; never place provider credentials or download URLs here.",
        },
        source_provider: {
          type: ["string", "null"],
          maxLength: 80,
          description:
            "Optional provider label for provenance (for example google). Google Drive and MailMyPDF library origins are normalized server-side.",
        },
        role: {
          type: "string",
          enum: ["subject_notice", "evidence"],
          description: "subject_notice for the primary notice/letter; evidence for supporting material.",
        },
        evidence_kind: {
          type: ["string", "null"],
          description: "Optional workflow-specific evidence kind when role is evidence.",
        },
        position: {
          type: "integer",
          minimum: 0,
          description: "Optional packet/evidence position.",
        },
        processing_consent: {
          type: "boolean",
          const: true,
          description: "Must be true only after the user has explicitly asked MailMyPDF to process this attachment.",
        },
      },
      ["matter_id", "idempotency_key", "file", "role", "processing_consent"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("security", "secureUpload", "documentStorage", "documentScanning"),
    _meta: {
      "openai/fileParams": ["file"],
      "openai/toolInvocation/invoking": "Securing attachment…",
      "openai/toolInvocation/invoked": "Attachment quarantined",
    },
  },
  {
    name: "save_matter_input",
    title: "Save verified workflow facts",
    description:
      "Save structured user-provided facts for a matter. Workflow-specific validation runs server-side before anything is persisted.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        idempotency_key: idempotencyKeySchema,
        input: {
          type: "object",
          description: "Workflow-specific structured facts collected from the user.",
          additionalProperties: true,
        },
      },
      ["matter_id", "idempotency_key", "input"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("identity", "matterState", "facts"),
  },
  {
    name: "analyze_matter",
    title: "Analyze a matter source document",
    description:
      "Run the registered MailMyPDF workflow analysis on the matter's clean source document. Document-first workflows require a previously uploaded and attached clean source document.",
    inputSchema: objectSchema(
      { matter_id: string("MailMyPDF matter id."), idempotency_key: idempotencyKeySchema },
      ["matter_id", "idempotency_key"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("security", "documentScanning", "classification", "extraction", "understand", "facts", "provenance", "validation"),
  },
  {
    name: "generate_draft",
    title: "Generate a draft document",
    description:
      "Generate a draft from the matter's validated facts, analysis, and clean documents. The generated text is returned for review and is not approved or mailed.",
    inputSchema: objectSchema(
      { matter_id: string("MailMyPDF matter id."), idempotency_key: idempotencyKeySchema },
      ["matter_id", "idempotency_key"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("aiExecution", "draft", "draftProvenance", "validation"),
  },
  {
    name: "save_draft",
    title: "Save reviewed draft",
    description:
      "Save the exact draft text the user has reviewed. Saving a draft does not approve a packet or authorize payment or mailing.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        idempotency_key: idempotencyKeySchema,
        body_text: string("Exact reviewed draft text to persist."),
      },
      ["matter_id", "idempotency_key", "body_text"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("matterState", "draft", "validation"),
  },
  {
    name: "preview_packet",
    title: "Preview mailing packet and quote",
    description:
      "Build the current immutable mailing packet preview and price quote, and bind the review to the recipient shown to the user. This does not approve, charge, or mail anything.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        idempotency_key: idempotencyKeySchema,
        mail_class: mailClassSchema,
        recipient: addressSchema,
      },
      ["matter_id", "idempotency_key", "mail_class", "recipient"],
    ),
    // Packet preview persists measured page counts as workflow metadata, so
    // this is intentionally not advertised as strictly read-only.
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: capabilities("pdfGeneration", "packetAssembly", "pricing", "addressVerification", "validation"),
    _meta: {
      ui: {
        resourceUri: PACKET_REVIEW_RESOURCE_URI,
        visibility: ["model", "app"],
      },
      "openai/outputTemplate": PACKET_REVIEW_RESOURCE_URI,
      "openai/toolInvocation/invoking": "Building exact mailing preview…",
      "openai/toolInvocation/invoked": "Mailing preview ready",
    },
  },
  {
    name: "approve_packet",
    title: "Approve exact packet for checkout",
    description:
      "Record explicit user approval of the exact packet hash, current quote, recipient, and mail class. Call only after the user has reviewed those exact details. Any packet or price change causes the server to reject stale approval.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        idempotency_key: idempotencyKeySchema,
        expected_packet_sha256: string("Exact SHA-256 returned by preview_packet."),
        expected_total_cents: integer("Exact total price in cents returned by preview_packet."),
        expected_recipient_sha256: string("Exact recipient SHA-256 returned by preview_packet."),
        recipient: addressSchema,
        mail_class: mailClassSchema,
      },
      [
        "matter_id",
        "idempotency_key",
        "expected_packet_sha256",
        "expected_total_cents",
        "expected_recipient_sha256",
        "recipient",
        "mail_class",
      ],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: [
      ...capabilities("humanReview", "blockingGate", "packetAssembly"),
      capabilityRequirement("approval", { requiresApproval: false }),
    ],
  },
  {
    name: "prepare_checkout",
    title: "Prepare secure checkout",
    description:
      "Create or reuse the Stripe-hosted checkout for an already approved packet and sender. This does not accept raw card data and does not itself claim that payment or mailing completed.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        idempotency_key: idempotencyKeySchema,
        approval_id: string("Approval id returned by approve_packet."),
        sender: addressSchema,
      },
      ["matter_id", "idempotency_key", "approval_id", "sender"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    capabilityRequirements: [
      ...capabilities("pricing", "approval"),
      capabilityRequirement("payment", { requiresApproval: false }),
    ],
  },
] as const;

export const MCP_PERSISTED_OPERATION_TOOL_NAMES = new Set([
  "ingest_document",
  "save_matter_input",
  "analyze_matter",
  "generate_draft",
  "save_draft",
  "preview_packet",
  "approve_packet",
  "prepare_checkout",
]);

export const MCP_PROTECTED_TOOL_NAMES = new Set(
  MAILMYPDF_MCP_TOOLS
    .filter((tool) => tool.securitySchemes.some((scheme) => scheme.type === "oauth2"))
    .map((tool) => tool.name),
);

export function getMcpTool(name: string): MailMyPdfMcpTool | undefined {
  return MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === name);
}

export function listMcpToolsForDiscovery() {
  const errors = validateMcpToolCapabilityContracts();
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return MAILMYPDF_MCP_TOOLS.map((tool) => {
    const { capabilityRequirements, ...protocolTool } = tool;
    return {
      ...protocolTool,
      _meta: {
        ...tool._meta,
        "mailmypdf/requiredCapabilities": capabilityRequirements
          .filter((requirement) => requirement.required !== false)
          .map((requirement) => requirement.id),
      },
    };
  });
}

export type McpConnectorContract = {
  schemaVersion: typeof MCP_CONNECTOR_CONTRACT_VERSION;
  capabilitySchemaVersion: "mailmypdf.capabilities/v1";
  connectorVersion: string;
  tools: readonly {
    name: string;
    requiredCapabilities: readonly CapabilityId[];
    capabilityVersions: Readonly<Record<string, string>>;
  }[];
};

export function validateMcpToolCapabilityContracts(): readonly string[] {
  const errors: string[] = [];
  for (const tool of MAILMYPDF_MCP_TOOLS) {
    const protectedTool = tool.securitySchemes.some((scheme) => scheme.type === "oauth2");
    if (protectedTool && !tool.annotations.readOnlyHint && tool.capabilityRequirements.length === 0) {
      errors.push(`${tool.name} mutates state but declares no capability requirements`);
    }
    if (MCP_PERSISTED_OPERATION_TOOL_NAMES.has(tool.name)) {
      const required = Array.isArray(tool.inputSchema.required)
        ? tool.inputSchema.required as readonly unknown[]
        : [];
      if (!required.includes("idempotency_key")) {
        errors.push(`${tool.name} does not require an idempotency key`);
      }
      if (tool.annotations.idempotentHint !== true) {
        errors.push(`${tool.name} is persisted but does not advertise idempotency`);
      }
    }
    const seen = new Set<string>();
    for (const requirement of tool.capabilityRequirements) {
      if (seen.has(requirement.id)) errors.push(`${tool.name} declares duplicate capability ${requirement.id}`);
      seen.add(requirement.id);
      if (!isRegisteredConnectorCapability(requirement.id)) {
        errors.push(`${tool.name} declares unknown capability ${requirement.id}`);
        continue;
      }
      const available = connectorCapabilityVersion(requirement.id);
      if (!available || (requirement.version && !isCapabilityVersionCompatible(requirement.version, available))) {
        errors.push(`${tool.name} requires incompatible ${requirement.id} version ${requirement.version ?? "unspecified"}`);
      }
    }
  }
  return errors;
}

export function getMcpConnectorContract(): McpConnectorContract {
  const errors = validateMcpToolCapabilityContracts();
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return {
    schemaVersion: MCP_CONNECTOR_CONTRACT_VERSION,
    capabilitySchemaVersion: "mailmypdf.capabilities/v1",
    connectorVersion: MCP_CONNECTOR_VERSION,
    tools: MAILMYPDF_MCP_TOOLS.map((tool) => ({
      name: tool.name,
      requiredCapabilities: tool.capabilityRequirements
        .filter((requirement) => requirement.required !== false)
        .map((requirement) => requirement.id as CapabilityId),
      capabilityVersions: Object.fromEntries(
        tool.capabilityRequirements.map((requirement) => [
          requirement.id,
          connectorCapabilityVersion(requirement.id) ?? "unknown",
        ]),
      ),
    })),
  };
}

export type McpToolReadiness = ConnectorCapabilityAssessment & {
  toolName: string;
  knownTool: boolean;
};

export function assessMcpToolReadiness(
  toolName: string,
  context: ConnectorCapabilityContext,
): McpToolReadiness {
  const tool = getMcpTool(toolName);
  if (!tool) {
    return {
      toolName,
      knownTool: false,
      requested: [],
      resolved: [],
      required: [],
      ready: false,
      diagnostics: [{
        capability: toolName,
        code: "UNKNOWN_CAPABILITY",
        severity: "error",
        message: `Unknown connector tool ${toolName}.`,
      }],
    };
  }
  return {
    toolName,
    knownTool: true,
    ...assessConnectorCapabilities(tool.capabilityRequirements, context),
  };
}

export function dryRunMcpTool(
  toolName: string,
  context: ConnectorCapabilityContext,
): {
  toolName: string;
  knownTool: boolean;
  ready: boolean;
  sideEffectsPerformed: false;
  resolvedCapabilities: readonly CapabilityId[];
  diagnostics: McpToolReadiness["diagnostics"];
} {
  const assessment = assessMcpToolReadiness(toolName, context);
  return {
    toolName,
    knownTool: assessment.knownTool,
    ready: assessment.ready,
    sideEffectsPerformed: false,
    resolvedCapabilities: assessment.resolved,
    diagnostics: assessment.diagnostics,
  };
}
