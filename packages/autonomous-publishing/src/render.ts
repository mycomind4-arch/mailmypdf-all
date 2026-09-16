import type { RenderAdapter } from "./adapters.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToSafeHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .split(/\n{2,}/)
    .map((block) => /^<h[1-3]>/.test(block) ? block : `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export function createHtmlRenderAdapter(): RenderAdapter {
  return {
    async render(edition) {
      const body = markdownToSafeHtml(edition.markdown);
      const title = escapeHtml(edition.subject);
      return {
        edition,
        text: edition.markdown,
        html: `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body>
<main style="max-width:680px;margin:0 auto;padding:32px 20px;font-family:Arial,Helvetica,sans-serif;line-height:1.6">
${body}
</main>
</body>
</html>`,
      };
    },
  };
}
