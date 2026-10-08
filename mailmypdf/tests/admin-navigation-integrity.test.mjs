import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const routeTargets = [
  ["/studio", "src/routes/_authenticated/studio/index.tsx", "/_authenticated/studio/"],
  ["/studio/builder", "src/routes/_authenticated/studio/builder.tsx", "/_authenticated/studio/builder"],
  ["/admin", "src/routes/_authenticated/admin/index.tsx", "/_authenticated/admin/"],
  ["/admin/analytics", "src/routes/_authenticated/admin/analytics.tsx", "/_authenticated/admin/analytics"],
  ["/admin/ai", "src/routes/_authenticated/admin/ai.tsx", "/_authenticated/admin/ai"],
  ["/admin/publications", "src/routes/_authenticated/admin/publications.tsx", "/_authenticated/admin/publications"],
  ["/admin/audit-log", "src/routes/_authenticated.admin.audit-log.tsx", "/_authenticated/admin/audit-log"],
  ["/admin/entitlements", "src/routes/_authenticated.admin.entitlements.tsx", "/_authenticated/admin/entitlements"],
  ["/admin/users", "src/routes/_authenticated/admin/users.tsx", "/_authenticated/admin/users"],
  ["/dashboard", "src/routes/_authenticated/dashboard/index.tsx", "/_authenticated/dashboard/"],
  ["/dashboard/orders", "src/routes/_authenticated/dashboard/orders.tsx", "/_authenticated/dashboard/orders"],
  ["/dashboard/settings", "src/routes/_authenticated/dashboard/settings.tsx", "/_authenticated/dashboard/settings"],
  ["/dashboard/workflows", "src/routes/_authenticated/dashboard/workflows/index.tsx", "/_authenticated/dashboard/workflows/"],
  ["/send", "src/routes/send.tsx", "/send"],
  ["/write", "src/routes/write.tsx", "/write"],
  ["/admin/orders/$id", "src/routes/_authenticated/admin/orders/$id.tsx", "/_authenticated/admin/orders/$id"],
  ["/admin/publications/$publicationId/$runId", "src/routes/_authenticated/admin/publications/$publicationId.$runId.tsx", "/_authenticated/admin/publications/$publicationId/$runId"],
];

test("authenticated and admin navigation targets resolve to real routes", () => {
  for (const [href, file, routeId] of routeTargets) {
    assert.equal(fs.existsSync(path.join(root, file)), true, href + " route file should exist");
    const routeSource = source(file);
    assert.equal(
      routeSource.includes('createFileRoute("' + routeId + '")') ||
        routeSource.includes("createFileRoute('" + routeId + "')"),
      true,
      href + " should resolve to " + routeId,
    );
  }
});

test("authenticated sidebar uses operational workspace destinations, not the public mail-a-pdf landing", () => {
  const sidebar = source("src/components/authenticated-sidebar.tsx");
  const primaryStart = sidebar.indexOf("export const primaryItems");
  const primaryEnd = sidebar.indexOf("export const adminItems");
  const primary = sidebar.slice(primaryStart, primaryEnd);

  assert.match(primary, /href: "\/send"/);
  assert.match(primary, /href: "\/write"/);
  assert.match(primary, /href: "\/dashboard\/orders"/);
  assert.equal(primary.includes('href: "/mail-a-pdf"'), false);
  assert.equal((primary.match(/href: "\/dashboard",/g) ?? []).length, 1,
    "only one primary item should target the dashboard root");
});

test("every Studio/Admin sidebar item has a real route target", () => {
  const sidebar = source("src/components/authenticated-sidebar.tsx");
  for (const href of [
    "/studio",
    "/studio/builder",
    "/admin",
    "/admin/users",
    "/admin/analytics",
    "/admin/ai",
    "/admin/publications",
    "/admin/audit-log",
    "/admin/entitlements",
  ]) {
    assert.equal(sidebar.includes('href: "' + href + '"'), true, "missing admin nav target " + href);
  }
});

test("admin shell is server-authorized and shared with the authenticated sidebar", () => {
  const authenticatedRoute = source("src/routes/_authenticated/route.tsx");
  const adminRoute = source("src/routes/_authenticated.admin.tsx");
  const adminFunctions = source("src/lib/admin.functions.ts");

  assert.match(authenticatedRoute, /<AuthenticatedSidebar/);
  assert.match(adminRoute, /isCurrentUserAdmin/);
  assert.match(adminFunctions, /\.from\("user_roles"\)/);
  assert.match(adminFunctions, /\.eq\("role", "admin"\)/);
});

test("entitlements and audit authorization no longer trusts auth metadata", () => {
  const functions = source("src/lib/entitlements-management.functions.ts");
  const domain = source("src/lib/entitlements-management.ts");

  assert.match(functions, /\.from\("user_roles"\)/);
  assert.match(functions, /\.eq\("role", "admin"\)/);
  assert.equal(functions.includes("app_metadata"), false);
  assert.equal(domain.includes("app_metadata"), false);
  assert.equal(domain.includes("super_admin"), false);
});

test("audit log is backed by real server data rather than demo rows", () => {
  const audit = source("src/routes/_authenticated.admin.audit-log.tsx");

  assert.match(audit, /listAuditLog/);
  assert.match(audit, /authenticatedHeaders/);
  assert.match(audit, /Export shown rows/);
  assert.equal(audit.includes("1,247"), false);
  assert.equal(audit.includes("a1b2c3d4"), false);
  assert.equal(audit.includes("customer@"), false);
});

test("entitlements page does not advertise an edit action that has no implementation", () => {
  const entitlements = source("src/routes/_authenticated.admin.entitlements.tsx");
  assert.equal(entitlements.includes(">Edit<"), false);
});

test("Studio factory control is an in-Studio action rather than a dead route", () => {
  const studio = source("src/components/admin-studio.tsx");
  assert.equal(studio.includes('href="/studio/factory"'), false);
  assert.match(studio, /onClick=\{\(\) => setLeftPanelView\("library"\)\}/);
});


test("Studio root is the command center and builder stays separately addressable", () => {
  const studioParent = source("src/routes/_authenticated/studio.tsx");
  const studioRoute = source("src/routes/_authenticated/studio/index.tsx");
  const builderRoute = source("src/routes/_authenticated/studio/builder.tsx");
  const commandCenter = source("src/components/studio-command-center.tsx");

  assert.match(studioParent, /<Outlet/);
  assert.match(studioParent, /isCurrentUserAdmin/);
  assert.match(studioRoute, /StudioCommandCenter/);
  assert.match(builderRoute, /StudioPage/);
  assert.match(commandCenter, /Open Workflow Builder/);
  assert.match(commandCenter, /ChatGPT connector/);
  assert.match(commandCenter, /Production services/);
  assert.match(commandCenter, /Recent fulfillment failures/);
});

test("Studio command center returns status booleans and counts, never service secrets", () => {
  const server = source("src/lib/studio-command-center.functions.ts");

  assert.match(server, /WORKFLOW_EXECUTION_REGISTRY/);
  assert.match(server, /buildFactoryGraduationReport/);
  assert.match(server, /MAILMYPDF_MCP_TOOLS/);
  assert.match(server, /user_profiles/);
  assert.match(server, /workflow_cases/);
  assert.equal(/secretKey\s*:/.test(server), false);
  assert.equal(/apiKey\s*:/.test(server), false);
  assert.equal(/webhookSecret\s*:/.test(server), false);
});

test("admin users surface is read-only and uses canonical user_roles", () => {
  const usersFn = source("src/lib/admin-users.functions.ts");
  const usersRoute = source("src/routes/_authenticated/admin/users.tsx");

  assert.match(usersFn, /\.from\("user_roles"\)/);
  assert.match(usersFn, /\.eq\("role", "admin"\)/);
  assert.match(usersFn, /\.from\("user_profiles"\)/);
  assert.equal(usersFn.includes(".update("), false);
  assert.equal(usersFn.includes(".delete("), false);
  assert.equal(usersFn.includes(".insert("), false);
  assert.match(usersRoute, /intentionally read-only/);
});


test("Studio Cloudflare target is the canonical MailMyPDF Worker", () => {
  const project = source("src/studio/domain/studio-project.ts");
  const publish = source("src/studio/lib/fns/publish-project-to-cloudflare.ts");
  const deploy = source("deploy.sh");

  assert.match(project, /deployment: "workers-script"/);
  assert.match(project, /workerName: "mailmypdf"/);
  assert.match(project, /appPath: "mailmypdf"/);
  assert.match(project, /deployScript: "deploy\.sh"/);
  assert.match(project, /tokenEnvVar: "CLOUDFLARE_API_TOKEN"/);

  assert.match(publish, /studioFileScanAuthMiddleware/);
  assert.match(publish, /run\("bash", \[scriptPath\]/);
  assert.equal(publish.includes("wrangler pages"), false);
  assert.equal(publish.includes("apps/mailmypdf"), false);
  assert.equal(publish.includes("apps/verticals"), false);

  assert.match(deploy, /preset: "cloudflare_module"/);
  assert.match(deploy, /verify:production-config -- --live/);
  assert.match(deploy, /wrangler deploy --config wrangler\.json/);
  assert.match(deploy, /verify:deployment/);
  assert.match(deploy, /mcp:readiness/);
});

test("Studio deploy confirmation targets the core project, not a selected workflow section", () => {
  const studio = source("src/components/admin-studio.tsx");
  const publishBlock = studio.slice(
    studio.indexOf("async function publishToCloudflare"),
    studio.indexOf("function addPhase", studio.indexOf("async function publishToCloudflare")),
  );

  assert.match(publishBlock, /projectId: activeProject\.id/);
  assert.equal(publishBlock.includes("verticalId"), false);
  assert.equal(publishBlock.includes("Choose a vertical workflow before publishing"), false);
});


test("Studio launch readiness is read-only and mirrors production launch gates", () => {
  const readiness = source("src/lib/studio-launch-readiness.functions.ts");
  const commandCenter = source("src/components/studio-command-center.tsx");

  assert.match(readiness, /MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF/);
  assert.match(readiness, /PAYMENTS_ENV|paymentEnv/);
  assert.match(readiness, /LOB_WEBHOOK_SECRET/);
  assert.match(readiness, /MAILMYPDF_SCANNER_JOB_SECRET/);
  assert.match(readiness, /MAILMYPDF_RETENTION_JOB_SECRET/);
  assert.match(readiness, /MAILMYPDF_CONNECTOR_JOB_SECRET/);
  assert.match(readiness, /secure-documents/);
  assert.match(readiness, /order-pdfs/);
  assert.match(readiness, /server\/discover/);
  assert.match(readiness, /tools\/list/);
  assert.match(readiness, /End-to-end sandbox canary/);
  assert.match(readiness, /Controlled live mailing canary/);

  assert.equal(readiness.includes(".insert("), false);
  assert.equal(readiness.includes(".update("), false);
  assert.equal(readiness.includes(".delete("), false);
  assert.equal(readiness.includes("paymentIntents.create"), false);
  assert.equal(readiness.includes("lobClient"), false);

  assert.match(commandCenter, /Launch readiness/);
  assert.match(commandCenter, /Run readiness checks/);
  assert.match(commandCenter, /Green automated checks do not replace the listed sandbox\/live canaries/);
});

test("Studio launch readiness never returns raw provider or job credentials", () => {
  const readiness = source("src/lib/studio-launch-readiness.functions.ts");
  const returned = readiness.slice(readiness.lastIndexOf("return {"));

  assert.equal(returned.includes("stripeSecret"), false);
  assert.equal(returned.includes("stripeWebhook"), false);
  assert.equal(returned.includes("LOB_API_KEY"), false);
  assert.equal(returned.includes("MAILMYPDF_CLEANUP_SECRET"), false);
  assert.equal(returned.includes("MAILMYPDF_MALWARE_SCANNER_KEY"), false);
});
