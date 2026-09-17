export type RegistryAdapterErrorCode =
  | "SOURCE_DISABLED"
  | "SOURCE_REQUIRES_COMPLIANCE_REVIEW"
  | "SOURCE_REQUIRES_HTTPS"
  | "UNSUPPORTED_QUERY"
  | "RATE_LIMITED"
  | "AUTHENTICATION_REQUIRED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_PROVIDER_RESPONSE"
  | "SEARCH_INCOMPLETE"
  | "CONFIGURATION_ERROR";

export class RegistryAdapterError extends Error {
  readonly code: RegistryAdapterErrorCode;
  readonly retryable: boolean;
  readonly sourceId?: string | undefined;

  constructor(input: {
    code: RegistryAdapterErrorCode;
    message: string;
    retryable?: boolean;
    sourceId?: string;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "RegistryAdapterError";
    this.code = input.code;
    this.retryable = input.retryable ?? false;
    this.sourceId = input.sourceId;
  }
}
