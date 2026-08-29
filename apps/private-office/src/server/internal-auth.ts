export function requireInternalServiceKey(request: Request): void {
  const expected = process.env.PRIVATE_OFFICE_INTERNAL_API_KEY;
  if (!expected)
    throw new Response(
      JSON.stringify({ error: "Internal service authentication is not configured" }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  const authorization = request.headers.get("authorization");
  const provided = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!provided || provided !== expected)
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
}
