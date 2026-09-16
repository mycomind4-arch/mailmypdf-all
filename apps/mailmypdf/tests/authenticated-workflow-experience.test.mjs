import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"

const root = path.resolve(import.meta.dirname, "..")
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8")

test("authenticated workflow routes are workspace-only and noindex", () => {
  for (const file of [
    "src/routes/_authenticated/dashboard/workflows/index.tsx",
    "src/routes/_authenticated/dashboard/workflows/$sectionId.tsx",
    "src/routes/_authenticated/dashboard/workflows/$sectionId/$workflowId.tsx",
  ]) {
    const source = read(file)
    assert.match(source, /noindex/)
    assert.doesNotMatch(source, /SiteHeader|SiteFooter|PublicVertical|heroImage|<img/)
  }
})

test("authenticated workflow browser contains no marketing hero or image system", () => {
  const source = read("src/components/authenticated-workflow-browser.tsx")
  assert.doesNotMatch(source, /hero|<img|background-image|SiteHeader|SiteFooter/i)
  assert.match(source, /workflowAuthorityForPath/)
  assert.match(source, /isCurrentUserAdmin/)
})

test("workflow registry separates public SEO and authenticated workspace hrefs", () => {
  const source = read("src/lib/workflow-navigation.ts")
  assert.equal((source.match(/"slug":/g) || []).length, 420)
  assert.equal((source.match(/"workflows": \[/g) || []).length, 14)
  assert.equal((source.match(/"publicHref":/g) || []).length, 434)
  assert.equal((source.match(/"workspaceHref":/g) || []).length, 434)
  assert.match(source, /\/dashboard\/workflows\/notice-respond\/cp2000-response/)
  assert.match(source, /\/notice-respond\/workflows\/cp2000-response/)
})

test("Studio sidebar routes signed-in workflow navigation to workspace URLs", () => {
  const source = read("src/components/authenticated-sidebar.tsx")
  assert.match(source, /\/dashboard\/workflows/)
  assert.match(source, /workflow\.workspaceHref/)
  assert.match(source, /section\.workspaceHref/)
  assert.doesNotMatch(source, /href="\/workflows"/)
})
