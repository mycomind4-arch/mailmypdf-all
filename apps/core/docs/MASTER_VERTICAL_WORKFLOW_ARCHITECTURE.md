# Master Vertical + Sub-Workflow Architecture

## Decision

Each standalone vertical repository is the **master product home** for a customer problem category and its related workflows.

A vertical is not limited to one workflow. It owns a coherent search-intent cluster and may contain many distinct workflows, canonical pages, routes, agents, analyses, and outputs.

## Example

```text
Notice Respond
├── Government notice response
├── Tax notice response
├── DMV notice response
├── Benefits notice response
├── Code enforcement notice response
└── Permit correction response
```

## Search architecture

```text
broad problem intent
        ↓
master vertical
        ↓
specific user intent
        ↓
specialized workflow
        ↓
workflow-specific content + product UX
        ↓
shared MailMyPDF document / mailing / proof layer
```

A workflow gets a dedicated canonical page when it represents materially different user intent, inputs, reasoning, output, or supporting information. Do not create thin keyword variations merely to capture search volume.

## Repository boundaries

### MailMyPDF platform

Owns reusable infrastructure:

- identity/authentication
- documents/storage
- payments
- mailing
- tracking
- proof
- shared UI/design system
- shared API/provider contracts

### Vertical repository

Owns:

- vertical-specific SEO/search intent
- workflow directory
- workflow UX
- domain-specific analysis
- workflow-specific extraction fields
- authoritative research sources
- drafting/review logic
- vertical-specific integrations

### Sub-workflow

Owns:

- a concrete user problem
- its required documents/facts
- workflow steps
- workflow-specific analysis
- output requirements
- canonical search page when warranted

## Migration

The existing ten MailMyPDF workflows remain discoverable through `/solutions` while their next-generation replacements are moved to standalone master repositories. A replacement becomes canonical only when it is genuinely functional.
