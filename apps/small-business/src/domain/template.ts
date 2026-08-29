export type TemplateVariable = { key: string; label: string; required: boolean; description?: string };
export type CorrespondenceTemplate = { id: string; businessId: string; name: string; description?: string; subject: string; body: string; variables: TemplateVariable[]; status: "draft" | "active" | "archived"; version: number; createdAt: string; updatedAt: string };

export function renderTemplate(template: CorrespondenceTemplate, values: Record<string, string>): { subject: string; body: string } {
  for (const variable of template.variables) if (variable.required && !String(values[variable.key] ?? "").trim()) throw new Error(`Missing required template variable: ${variable.key}`);
  const render = (value: string) => value.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => values[key] ?? "");
  return { subject: render(template.subject), body: render(template.body) };
}
