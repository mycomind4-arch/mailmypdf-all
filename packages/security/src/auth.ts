export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export interface ServerValidatedUserClient<User> {
  auth: {
    getUser(accessToken: string): Promise<{
      data: { user: User | null };
      error?: unknown;
    }>;
  };
}

export interface AuthenticatedUserContext<Client, User> {
  client: Client;
  user: User;
  accessToken: string;
}

export interface BearerAuthenticatorDependencies<Client extends ServerValidatedUserClient<User>, User> {
  /**
   * Must return a user-scoped client configured with the supplied bearer token.
   * Deliberately no service-role/admin credential is accepted by this contract.
   */
  createUserScopedClient(accessToken: string): Client;
}

export function readBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthenticationError("A bearer access token is required");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError("A bearer access token is required");
  return token;
}

/**
 * Creates an authenticator that validates the bearer token with the identity
 * provider on the server. It never trusts a locally decoded JWT payload.
 */
export function createBearerAuthenticator<Client extends ServerValidatedUserClient<User>, User>(
  dependencies: BearerAuthenticatorDependencies<Client, User>,
) {
  return async function requireAuthenticatedUser(
    request: Request,
  ): Promise<AuthenticatedUserContext<Client, User>> {
    const accessToken = readBearerToken(request);
    const client = dependencies.createUserScopedClient(accessToken);
    const { data, error } = await client.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AuthenticationError("The access token is invalid or expired");
    }

    return { client, user: data.user, accessToken };
  };
}
