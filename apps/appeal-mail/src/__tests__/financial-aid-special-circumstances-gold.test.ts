import { describe, expect, it } from "vitest";
import { getWorkflow } from "@/domain/workflows";
describe("financial-aid-special-circumstances Gold workflow",()=>{it("defines the three-stage experience and document-first intent",()=>{const w=getWorkflow("financial-aid-special-circumstances");expect(w.id).toBe("financial-aid-special-circumstances");expect(w.experienceStages).toEqual(["understand","build","send"]);expect(w.acceptsDocuments).toBe(true);expect(w.workflowPrompt.length).toBeGreaterThan(50);expect(w.primaryKeyword).toBe("financial aid special circumstances letter sample");});});
