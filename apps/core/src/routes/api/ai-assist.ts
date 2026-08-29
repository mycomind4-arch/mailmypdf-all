import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai-assist")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const { action, prompt, currentText, letterType } = body;

          // Validate
          const validActions = ["generate", "improve", "formal", "friendly", "firm", "shorten", "expand"];
          if (!validActions.includes(action)) {
            return Response.json({ error: "Invalid action" }, { status: 400 });
          }

          const env = (globalThis as any).__env__ as any;
          const aiBinding = env?.AI;

          if (!aiBinding) {
            return Response.json({ error: "AI service not configured" }, { status: 500 });
          }

          const systemPrompt = `You are a professional letter writing assistant for MailMyPDF, a service that prints and physically mails letters. You help users write clear, effective letters for real-world situations — legal notices, business correspondence, personal letters, official filings, and more.

Guidelines:
- Write complete, ready-to-mail letters with proper formatting (date, addresses, salutation, body, closing)
- Use [BRACKETS] for placeholders the user must fill in (names, dates, amounts, etc.)
- Keep letters to 1-2 pages when possible (under 800 words unless asked to expand)
- Be professional and appropriate to the letter's purpose
- Do NOT include legal disclaimers or advice — you write letters, not counsel
- Output ONLY the letter text, no meta-commentary or explanations`;

          const context = currentText ? `\n\nCurrent letter text:\n${currentText}` : "";
          const typeLabel = letterType ? ` (letter type: ${letterType})` : "";
          
          let userPrompt = "";
          switch (action) {
            case "generate":
              userPrompt = `Write a complete letter${typeLabel} based on this request:\n${prompt || "Write a general professional letter."}${context}\n\nWrite the full letter with proper formatting, ready to print and mail.`;
              break;
            case "improve":
              userPrompt = `Improve this letter — fix grammar, clarity, and flow while keeping the same meaning and tone. Keep it professional.${context}\n\nReturn the improved letter only.`;
              break;
            case "formal":
              userPrompt = `Rewrite this letter to be more formal and professional. Use proper business letter conventions.${context}\n\nReturn the rewritten letter only.`;
              break;
            case "friendly":
              userPrompt = `Rewrite this letter to be warmer and more friendly while still being professional. Keep it appropriate for the context.${context}\n\nReturn the rewritten letter only.`;
              break;
            case "firm":
              userPrompt = `Rewrite this letter to be more assertive and firm while remaining professional. Make the position clear and the expectations explicit.${context}\n\nReturn the rewritten letter only.`;
              break;
            case "shorten":
              userPrompt = `Shorten this letter to be more concise while keeping all key points. Aim for under 400 words if possible.${context}\n\nReturn the shortened letter only.`;
              break;
            case "expand":
              userPrompt = `Expand this letter with more detail and supporting points. Add relevant context that strengthens the message.${context}\n\nReturn the expanded letter only.`;
              break;
          }

          const result: any = await aiBinding.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 2000,
            temperature: 0.7,
          });

          const text = result?.response || "";
          if (!text) {
            return Response.json({ error: "AI returned no content" }, { status: 500 });
          }

          return Response.json({ text: text.trim(), action });
        } catch (e: any) {
          return Response.json({ error: e?.message || "AI assistance failed" }, { status: 500 });
        }
      },
    },
  },
});
