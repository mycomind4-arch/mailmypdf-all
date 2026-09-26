const TOKEN_PATTERN = /^[A-Za-z0-9._~+-]{8,512}$/;

export function openAiAppsChallengeToken(
  envValue = process.env.OPENAI_APPS_CHALLENGE_TOKEN,
): string | null {
  const token = envValue?.trim() ?? "";
  if (!token || !TOKEN_PATTERN.test(token)) return null;
  return token;
}

export function handleOpenAiAppsChallenge(): Response {
  const token = openAiAppsChallengeToken();
  if (!token) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  return new Response(token, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
