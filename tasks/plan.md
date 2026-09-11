# Implementation Plan: Private Office Build Studio

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

