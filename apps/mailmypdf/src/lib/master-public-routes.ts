export type PublicRouteKind =
  | "core"
  | "account"
  | "admin"
  | "product"
  | "placeholder"
  | "resource";

export type MasterPublicRoute = {
  path: string;
  title: string;
  description: string;
  kind: PublicRouteKind;
  auth?: "public" | "authenticated" | "admin";
  product?: string;
};

/** Canonical public IA used by the MailMyPDF gateway. */
export const MASTER_PUBLIC_ROUTES: readonly MasterPublicRoute[] = [
  { path: "/", title: "MailMyPDF", description: "Prepare and send important documents by mail.", kind: "core" },
  { path: "/send", title: "Send a Document", description: "Upload and mail a document.", kind: "core" },
  { path: "/write", title: "Write a Letter", description: "Write and mail a letter online.", kind: "core" },
  { path: "/pricing", title: "MailMyPDF Pricing", description: "Mailing and product pricing.", kind: "core" },
  { path: "/ecosystem", title: "MailMyPDF Products", description: "Explore the MailMyPDF product family.", kind: "core" },
  { path: "/resources", title: "MailMyPDF Resources", description: "Guides and resources for important correspondence.", kind: "resource" },
  { path: "/templates", title: "Letter Templates", description: "Reusable correspondence templates.", kind: "resource" },
  { path: "/proof-of-service", title: "Proof of Service", description: "Mailing evidence and proof infrastructure.", kind: "resource" },
  { path: "/verify", title: "Verify Proof", description: "Verify a public mailing proof record.", kind: "resource" },

  { path: "/dashboard", title: "MailMyPDF Dashboard", description: "Your MailMyPDF workspace.", kind: "account", auth: "authenticated" },
  { path: "/dashboard/orders", title: "Mailing History", description: "Your authenticated mailing history.", kind: "account", auth: "authenticated" },
  { path: "/dashboard/products", title: "Your Products", description: "Your MailMyPDF product workspaces.", kind: "account", auth: "authenticated" },
  { path: "/dashboard/settings", title: "Account Settings", description: "Manage your account settings.", kind: "account", auth: "authenticated" },
  { path: "/account/profile", title: "Profile", description: "Manage your MailMyPDF profile.", kind: "account", auth: "authenticated" },
  { path: "/account/security", title: "Account Security", description: "Manage sign-in and account security.", kind: "account", auth: "authenticated" },
  { path: "/account/preferences", title: "Account Preferences", description: "Manage communication and product preferences.", kind: "account", auth: "authenticated" },

  { path: "/admin", title: "MailMyPDF Admin", description: "Platform administration.", kind: "admin", auth: "admin" },
  { path: "/admin/orders", title: "Admin Orders", description: "Manage mailing orders.", kind: "admin", auth: "admin" },
  { path: "/admin/users", title: "Admin Users", description: "Manage users and access.", kind: "admin", auth: "admin" },
  { path: "/admin/products", title: "Admin Products", description: "Manage product registrations.", kind: "admin", auth: "admin" },
  { path: "/admin/fulfillment", title: "Admin Fulfillment", description: "Monitor physical mailing fulfillment.", kind: "admin", auth: "admin" },
  { path: "/admin/payments", title: "Admin Payments", description: "Monitor payments and billing events.", kind: "admin", auth: "admin" },
  { path: "/admin/seo", title: "Admin SEO", description: "Manage public SEO metadata and indexing controls.", kind: "admin", auth: "admin" },
  { path: "/admin/system", title: "Admin System", description: "Platform health and operational controls.", kind: "admin", auth: "admin" },

  { path: "/mail", title: "MailMyPDF Workflows", description: "Core document and letter workflows.", kind: "product", product: "mail" },
  { path: "/appeal", title: "Appeal Mail", description: "Prepare and send appeals.", kind: "product", product: "appeal" },
  { path: "/notice", title: "Notice Respond", description: "Understand and respond to notices.", kind: "product", product: "notice" },
  { path: "/immigration", title: "Immigration Mail", description: "Prepare immigration correspondence.", kind: "product", product: "immigration" },
  { path: "/dispute", title: "Dispute Mail", description: "Prepare and send dispute correspondence.", kind: "product", product: "dispute" },
  { path: "/business", title: "Small Business Mail", description: "Business correspondence and mailing workflows.", kind: "product", product: "business" },
  { path: "/records", title: "Records Request", description: "Prepare and send records requests.", kind: "product", product: "records" },
  { path: "/tenant", title: "Tenant Reply", description: "Prepare tenant-related replies.", kind: "product", product: "tenant" },
  { path: "/permit", title: "Permit Reply", description: "Prepare permit-related replies.", kind: "product", product: "permit" },
  { path: "/benefits", title: "Benefits Appeal", description: "Prepare benefits appeals.", kind: "product", product: "benefits" },
  { path: "/claim", title: "Claim Proof", description: "Prepare claim-proof correspondence.", kind: "product", product: "claim" },
  { path: "/future", title: "Future Mail", description: "Additional MailMyPDF workflows.", kind: "product", product: "future" },
];

export const PRODUCT_FAMILY_NAV = [
  { label: "Mail a Document", href: "/send" },
  { label: "Write a Letter", href: "/write" },
  { label: "Appeal Mail", href: "/appeal-reply" },
  { label: "Notice Respond", href: "/notice-response" },
  { label: "Immigration Mail", href: "/immigration" },
  { label: "Dispute Mail", href: "/dispute-mail" },
  { label: "Small Business", href: "/small-business-mail" },
  { label: "Records Request", href: "/records" },
  { label: "Tenant Reply", href: "/tenant" },
  { label: "Permit Reply", href: "/permit" },
  { label: "Benefits Appeal", href: "/benefits" },
  { label: "Claim Proof", href: "/claim" },
] as const;
