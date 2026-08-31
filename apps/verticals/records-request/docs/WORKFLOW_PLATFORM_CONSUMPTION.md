# Workflow Platform Consumption

The Records Requests vertical must consume reusable MailMyPDF platform capabilities instead of creating parallel implementations.

## Current state

The platform packages are currently workspace packages and are not yet safe to declare as ordinary external dependencies. The platform package publication work is tracked in MailMyPDF Platform issue #30.

Until that work is complete, Records Requests uses narrow compatibility contracts in `src/platform/adapters.ts`. These are boundary types, not copied platform implementations.

## Migration rule

When the platform packages become consumable:

1. Replace the compatibility types with imports from the stable platform packages.
2. Keep Records-specific domain types local.
3. Delete redundant local implementations only after parity tests pass.
4. Do not change workflow behavior merely to match package structure.
5. Re-run the complete Records Requests certification suite.

## First workflow

`code-enforcement-records` will be implemented only after the platform-consumption boundary is certified. It should supply records-domain intelligence while inheriting generic lifecycle, intelligence, proof, fulfillment, and workflow semantics from the ecosystem.
