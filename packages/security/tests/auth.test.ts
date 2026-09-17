import assert from "node:assert/strict";
import test from "node:test";
import { AuthenticationError, createBearerAuthenticator } from "../src/auth.js";

test("rejects missing bearer token", async () => {
  const authenticate = createBearerAuthenticator({
    createUserScopedClient: () => ({
      auth: { async getUser() { return { data: { user: { id: "u1" } } }; } },
    }),
  });

  await assert.rejects(
    () => authenticate(new Request("https://example.test")),
    AuthenticationError,
  );
});

test("validates token with provider getUser and returns user-scoped client", async () => {
  let validatedToken = "";
  const authenticate = createBearerAuthenticator({
    createUserScopedClient: (token: string) => ({
      token,
      auth: {
        async getUser(value: string) {
          validatedToken = value;
          return { data: { user: { id: "user-123" } } };
        },
      },
    }),
  });

  const context = await authenticate(new Request("https://example.test", {
    headers: { authorization: "Bearer server-validated-token" },
  }));

  assert.equal(validatedToken, "server-validated-token");
  assert.equal(context.user.id, "user-123");
  assert.equal(context.client.token, "server-validated-token");
});

test("fails closed when provider rejects the bearer token", async () => {
  const authenticate = createBearerAuthenticator({
    createUserScopedClient: () => ({
      auth: { async getUser() { return { data: { user: null }, error: new Error("expired") }; } },
    }),
  });

  await assert.rejects(
    () => authenticate(new Request("https://example.test", {
      headers: { authorization: "Bearer expired-token" },
    })),
    /invalid or expired/,
  );
});
