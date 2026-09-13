/**
 * CP2000 step-workflow's packet assembly — thin wrapper over the shared
 * step-matter-packet.ts assembler, supplying just this workflow's letter
 * text (generateCP2000MatterDraft, reusing the mature CP2000 domain engine).
 */
import type { StepMatterState } from "@mailmypdf/step-workflow";
import { generateCP2000MatterDraft } from "@/domain/step-workflows/cp2000";
import { assembleMatterPacket as assembleGenericPacket, type AssembleMatterPacketOptions, type AssembledMatterPacket } from "./step-matter-packet";

export type { AssembledMatterPacket };

export async function assembleMatterPacket(
  matter: StepMatterState,
  options: AssembleMatterPacketOptions = {},
): Promise<AssembledMatterPacket> {
  return assembleGenericPacket(matter, generateCP2000MatterDraft(matter), options);
}
