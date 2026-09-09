# Task Packet Template

Use this for substantial implementation, audit, research, or handoff work. Delete unused sections rather than filling them with noise.

```md
# TASK — <short name>

## Goal
<one outcome>

## Canonical location
Repo: mycomind4-arch/mailmypdf-all
App/package: <path>

## Scope
In:
- <area>

Out:
- <area intentionally excluded>

## Current evidence
- <verified fact + source/file/test>
- <verified fact + source/file/test>

## Applicable decisions/contracts
- <ADR/contract/spec>

## Constraints
- <non-negotiable behavior/security/deployment constraint>

## Execution path
<small call/data flow being changed or audited>

## Relevant files
- <only files currently known to matter>

## Acceptance criteria
- [ ] <observable condition>
- [ ] <observable condition>
- [ ] tests/build/checks appropriate to scope pass

## Unknowns
- <only unresolved facts that could change implementation>

## Verification
Commands/checks:
- <command or runtime check>

## Durable updates after completion
- [ ] CURRENT_STATE if operational truth changed
- [ ] ADR if architecture changed
- [ ] contract/spec if reusable behavior changed
- [ ] checkpoint if a future session needs a handoff
```

## Rule

The task packet should point to evidence rather than duplicate it. A file path, ADR, test name, route, or checkpoint is usually cheaper and safer than pasting a large document into the packet.