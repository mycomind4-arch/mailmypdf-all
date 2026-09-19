/**
 * Application Services — public API.
 *
 * Import from `@/services` rather than individual files:
 *   import { MailService, StateMachineService } from "@/services";
 */

export { DocumentService } from "./document.service";
export { PricingService } from "./pricing.service";
export { BillingService } from "./billing.service";
export { MailService } from "./mail.service";
export { EventHistoryService } from "./event-history.service";
export { StateMachineService } from "./state-machine.service";
export { TrackingService } from "./tracking.service";

// Singleton instances for convenience
import { MailService } from "./mail.service";
import { StateMachineService } from "./state-machine.service";
import { TrackingService } from "./tracking.service";

const _mailService = new MailService();
const _stateMachineService = new StateMachineService();
const _trackingService = new TrackingService(_stateMachineService);

export function getMailService(): MailService {
  return _mailService;
}

export function getStateMachineService(): StateMachineService {
  return _stateMachineService;
}

export function getTrackingService(): TrackingService {
  return _trackingService;
}
