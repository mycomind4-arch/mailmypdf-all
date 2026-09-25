export const MCP_CONNECTOR_VERSION = "0.4.0";
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
    openWorldHint: boolean;
  };
  securitySchemes: readonly (
    | { type: "noauth" }
    | { type: "oauth2"; scopes: readonly string[] }
  )[];
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

const oauth = (...scopes: string[]) => [{ type: "oauth2" as const, scopes }] as const;
const noauth = [{ type: "noauth" as const }] as const;

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
  },
  {
    name: "get_workflow",
    title: "Get workflow details",
    description:
      "Get the canonical MailMyPDF section, public URL, and authenticated workspace URL for one workflow id.",
    inputSchema: objectSchema({ workflow_id: string("Canonical workflow id/slug.") }, ["workflow_id"]),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: noauth,
  },
  {
    name: "get_profile",
    title: "Get connected MailMyPDF profile",
    description:
      "Return the MailMyPDF account currently connected to this MCP request. Use to confirm which account owns new matters and documents.",
    inputSchema: objectSchema({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
    _meta: { "openai/profile": true },
  },
  {
    name: "create_matter",
    title: "Create a MailMyPDF matter",
    description:
      "Create an owner-scoped matter for a specific MailMyPDF workflow. This creates workspace state but does not generate, approve, pay for, or mail anything.",
    inputSchema: objectSchema(
      {
        workflow_id: string("Canonical workflow id returned by find_workflow/get_workflow."),
        section_id: string("Canonical root section id, such as notice-respond or records-request."),
      },
      ["workflow_id", "section_id"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "get_matter",
    title: "Get matter state",
    description:
      "Load an owner-scoped MailMyPDF matter and its attached document metadata.",
    inputSchema: objectSchema({ matter_id: string("MailMyPDF matter id.") }, ["matter_id"]),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "get_order_status",
    title: "Get mailing order status",
    description:
      "Read the connected user's MailMyPDF payment and mailing status, sanitized event history, provider reference, and recorded tracking details. Supply an order_id or matter_id. This tool is read-only and never polls or mutates the mail provider.",
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
        mail_class: mailClassSchema,
        color: { type: "boolean", default: false, description: "Print in color when true." },
        idempotency_key: string("Stable 8-128 character key for retries of this one mailing intent. Use a new key for an intentional duplicate mailing."),
      },
      ["document_id", "sender", "recipient", "mail_class", "idempotency_key"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "approve_direct_pdf_mail",
    title: "Approve exact direct PDF mailing",
    description:
      "Record explicit user approval of the exact direct-mail PDF hash, quoted price, sender, recipient, mail class, and color settings currently on the prepared order. Call only after the user has reviewed those exact details returned by prepare_direct_pdf_mail.",
    inputSchema: objectSchema(
      {
        order_id: string("MailMyPDF direct-mail order id."),
        expected_packet_sha256: string("Exact PDF SHA-256 returned by prepare_direct_pdf_mail."),
        expected_total_cents: integer("Exact total price in cents returned by prepare_direct_pdf_mail."),
      },
      ["order_id", "expected_packet_sha256", "expected_total_cents"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
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
  },
  {
    name: "ingest_document",
    title: "Securely ingest an attached document",
    description:
      "Copy a user-authorized assistant attachment into MailMyPDF quarantine storage and attach it to an owner-scoped matter. Use only when the user has explicitly asked MailMyPDF to process that file. The document remains untrusted until MailMyPDF scanning marks it clean; this tool does not analyze, approve, pay for, or mail anything.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id that should own the document."),
        file: assistantFileSchema,
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
      ["matter_id", "file", "role", "processing_consent"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
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
        input: {
          type: "object",
          description: "Workflow-specific structured facts collected from the user.",
          additionalProperties: true,
        },
      },
      ["matter_id", "input"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "analyze_matter",
    title: "Analyze a matter source document",
    description:
      "Run the registered MailMyPDF workflow analysis on the matter's clean source document. Document-first workflows require a previously uploaded and attached clean source document.",
    inputSchema: objectSchema({ matter_id: string("MailMyPDF matter id.") }, ["matter_id"]),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "generate_draft",
    title: "Generate a draft document",
    description:
      "Generate a draft from the matter's validated facts, analysis, and clean documents. The generated text is returned for review and is not approved or mailed.",
    inputSchema: objectSchema({ matter_id: string("MailMyPDF matter id.") }, ["matter_id"]),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "save_draft",
    title: "Save reviewed draft",
    description:
      "Save the exact draft text the user has reviewed. Saving a draft does not approve a packet or authorize payment or mailing.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        body_text: string("Exact reviewed draft text to persist."),
      },
      ["matter_id", "body_text"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "preview_packet",
    title: "Preview mailing packet and quote",
    description:
      "Build the current immutable mailing packet preview and price quote from the saved draft and included documents. This does not approve, charge, or mail anything.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        mail_class: mailClassSchema,
      },
      ["matter_id", "mail_class"],
    ),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "approve_packet",
    title: "Approve exact packet for checkout",
    description:
      "Record explicit user approval of the exact packet hash, current quote, recipient, and mail class. Call only after the user has reviewed those exact details. Any packet or price change causes the server to reject stale approval.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        expected_packet_sha256: string("Exact SHA-256 returned by preview_packet."),
        expected_total_cents: integer("Exact total price in cents returned by preview_packet."),
        recipient: addressSchema,
        mail_class: mailClassSchema,
      },
      ["matter_id", "expected_packet_sha256", "expected_total_cents", "recipient", "mail_class"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
  {
    name: "prepare_checkout",
    title: "Prepare secure checkout",
    description:
      "Create or reuse the Stripe-hosted checkout for an already approved packet and sender. This does not accept raw card data and does not itself claim that payment or mailing completed.",
    inputSchema: objectSchema(
      {
        matter_id: string("MailMyPDF matter id."),
        approval_id: string("Approval id returned by approve_packet."),
        sender: addressSchema,
      },
      ["matter_id", "approval_id", "sender"],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    securitySchemes: oauth(...MCP_OAUTH_SCOPES),
  },
] as const;

export const MCP_PROTECTED_TOOL_NAMES = new Set(
  MAILMYPDF_MCP_TOOLS
    .filter((tool) => tool.securitySchemes.some((scheme) => scheme.type === "oauth2"))
    .map((tool) => tool.name),
);

export function getMcpTool(name: string): MailMyPdfMcpTool | undefined {
  return MAILMYPDF_MCP_TOOLS.find((tool) => tool.name === name);
}
