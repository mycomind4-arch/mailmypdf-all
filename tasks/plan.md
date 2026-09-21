# Implementation Plan: Private Office Build Studio

> Separate user-approved core work: [Mail Desk spec and implementation order](mail-desk/spec.md), [Mail Desk tasks](mail-desk/todo.md). Studio tasks below are unchanged.

## Overview

Turn the current `/studio` mockup into an owner-only workflow authoring layer above the existing Private Office runtime. MVP 1 will support editable workflow graphs, structured proposals, validation, local draft persistence, version history, and simulation stubs while preserving the existing fixed workflows.

## Architecture Decisions

- Keep Studio workflow state as a typed JSON document first; add normalized Supabase tables after the interaction contract is stable.
- Treat the Studio document as the source of truth. Claude proposals become operation patches that can be reviewed, applied, rejected, undone, or redone.
- Reuse the existing capability and LLM registries; missing capabilities remain explicit states rather than arbitrary strings.
- Keep external actions disabled in Design and Simulation modes.

## Task List

### Phase 1: Foundation
- [ ] Define Studio workflow, phase, capability, gate, policy, proposal, and fixture types.
- [ ] Implement graph operation patches with undo/redo and immutable state updates.
- [ ] Add structural validation for cycles, unreachable nodes, missing capabilities, provenance, and consequential-action gates.

### Checkpoint: Foundation
- [ ] Domain tests cover graph edits and validation findings.
- [ ] Existing Private Office tests remain green.

### Phase 2: Core Studio Flow
- [ ] Wire the canvas to editable Studio state and selection.
- [ ] Add phase creation, editing, deletion, reordering, and connection controls.
- [ ] Add proposal review/apply/reject UI and local draft persistence.
- [ ] Add version save, list, compare, and restore behavior.

### Checkpoint: Core Features
- [ ] Owner can create and edit a workflow without touching TypeScript.
- [ ] Reloading `/studio` preserves the draft locally.
- [ ] Validate reports actionable findings.

### Phase 3: Simulation and Access
- [ ] Add simulation mode with mocked external actions and execution timeline.
- [ ] Add fixture creation and test-run result display.
- [ ] Add owner-only authorization boundary for Studio routes and server operations.

### Phase 4: Capability Handoff
- [ ] Add capability registry search and missing-capability recommendations.
- [ ] Add Code Mode handoff records and reviewable implementation status.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Studio graph diverges from runtime contracts | High | Validate against canonical capability and gate registries before save or simulation. |
| Owner-only access is inferred from authentication | High | Add an explicit owner identity or allowlist policy at the server boundary. |
| UI grows into one large component | Medium | Split chat, canvas, inspector, simulation, and history into focused components. |

---

# Implementation Plan: Agent Command Center

## Overview

Evolve Studio into one command center for Claude and Codex. An owner describes an outcome, selects an available provider and model, and launches a bounded background team that can build, test, evaluate workflows, review UX and accessibility, audit safety, and prepare a release packet.

## Architecture Decisions

- Keep agents in disposable worktrees and merge only an independently reviewed, passing change into the integration branch.
- Use an explicit, allowlisted role catalog rather than allowing generated shell commands or unrestricted role definitions.
- Treat provider/model selection as validated server-side configuration.
- Cap concurrent workers, attempts, duration, and token/cost budget per run.
- Never copy ignored files or local credentials into agent worktrees. Claude runs without host-wide bypass permissions.

## Task List

### Phase 1: Safe, green foundation
- [ ] Repair the existing Private Office test baseline and add regression coverage for the fixed contracts.
- [ ] Make worktree setup fail closed; prevent secrets/ignored files from entering runs; serialize integration merges.
- [ ] Add swarm unit tests for provider commands, cancellation, failed setup, and run-state transitions.

### Phase 2: Unified command contract
- [ ] Define typed provider, model, role, budget, and run-plan contracts.
- [ ] Add outcome-driven background run planning while preserving the existing simple-run endpoint.

### Phase 3: Command Center UI
- [ ] Replace the separate Claude and Agents panels with one accessible command center.
- [ ] Show provider/model controls, selected team, progress, evidence, budget, errors, and human approval state.

### Phase 4: Useful agent capabilities
- [ ] Workflow evaluator and regression-suite curator.
- [ ] Browser/visual QA and accessibility reviewer.
- [ ] Safety/compliance reviewer and release-packet generator.
- [ ] Documentation and design-system steward roles.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Agents leak credentials from a developer machine | Critical | Copy tracked files only, explicit secret exclusions, least-privilege CLI modes. |
| Parallel agents conflict or exceed cost | High | Per-run concurrency/budget caps and a serialized integration queue. |
| Model output influences unsafe execution | High | Fixed role catalog, validated inputs, isolated worktrees, and human integration approval. |
