import type { ConnectorOperation } from "@mailmypdf/workflows/connector-operation";

export type ConnectorCheckoutCorrelation = {
  operationId: string;
  requestSha256: string;
};

// The workflow runtime is invoked in-process by the MCP adapter. A WeakMap
// carries correlation without exposing spoofable internal headers on the
// authenticated HTTP runtime route.
const connectorCorrelations = new WeakMap<Request, ConnectorCheckoutCorrelation>();

export function bindConnectorCheckoutCorrelation(
  request: Request,
  operation: Pick<ConnectorOperation, "id" | "requestSha256">,
): Request {
  connectorCorrelations.set(request, {
    operationId: operation.id,
    requestSha256: operation.requestSha256,
  });
  return request;
}

export function getConnectorCheckoutCorrelation(
  request: Request,
): ConnectorCheckoutCorrelation | undefined {
  return connectorCorrelations.get(request);
}
