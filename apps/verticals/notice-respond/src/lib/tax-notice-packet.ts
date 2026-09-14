/**
 * Tax Notice's packet assembly — thin wrapper over the shared
 * step-matter-packet.ts assembler, supplying just this workflow's letter
 * text (generateTaxNoticeDraft). See step-matter-packet.ts for the actual
 * merge logic shared by every step-workflow.
 */
import type { StepMatterState } from "@mailmypdf/step-workflow";
import { generateTaxNoticeDraft } from "@/domain/step-workflows/tax-notice";
import { assembleMatterPacket as assembleGenericPacket, type AssembleMatterPacketOptions, type AssembledMatterPacket } from "./step-matter-packet";

export type { AssembledMatterPacket };

export async function assembleMatterPacket(
  matter: StepMatterState,
  options: AssembleMatterPacketOptions = {},
): Promise<AssembledMatterPacket> {
  return assembleGenericPacket(matter, generateTaxNoticeDraft(matter), options);
}
