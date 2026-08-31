# Notice Respond — Master Workflow Directory

Notice Respond is the master product for the broader **respond to an official notice** search-intent category.

This repository owns the workflows beneath that category. A new notice type should normally become a workflow/page/route here rather than a new repository.

## Workflow model

**Notice type → source documents → extracted facts → deadline/requirements → evidence → research → response → review → MailMyPDF**

## Initial workflow families

- Government notice response
- Tax notice response
- DMV notice response
- Benefits notice response
- Code enforcement notice response
- Permit correction response
- Licensing/compliance notice response
- Agency correspondence response

Each workflow should have its own search-intent mapping, document requirements, extraction fields, response structure, and authoritative research sources where needed.

## SEO rule

A workflow deserves a dedicated canonical page when the user intent, supporting information, workflow steps, or output materially differ. Do not generate thin keyword variants of the same page.

## Architecture rule

Keep shared identity, document storage, payments, mailing, tracking, proof, and design-system primitives in the MailMyPDF/platform layer. Keep notice-specific intelligence and workflow logic here.


## Current Status (2026-08-27)

**18 workflows in production** across the notice-respond vertical:

### Tax Notices
- cp2000-response — IRS CP2000 underreported income (AUTHORITY)
- cp14-response — IRS CP14 balance due (AUTHORITY)
- cp504-response — IRS CP504 intent to levy (FUNCTIONAL)
- cp523-response — IRS CP523 installment agreement default (FUNCTIONAL)
- irs-notice — Generic IRS notice (FUNCTIONAL)
- tax-notice — Tax authority notice (FUNCTIONAL, LLM-powered)

### Court & Agency
- court-summons — Court summons response (FUNCTIONAL)
- agency-action — Agency action response (FUNCTIONAL)
- file-appeal — Appeal filing (FUNCTIONAL)

### Property & Local Government
- code-enforcement — Code enforcement notice (FUNCTIONAL, LLM-powered)
- permit-correction — Permit correction notice (FUNCTIONAL, LLM-powered)

### State Agencies
- dmv-notice — DMV notice (FUNCTIONAL, LLM-powered)

### Benefits & Identity
- ssa-notice — Social Security Administration notice (FUNCTIONAL, LLM-powered)
- benefits-notice — Benefits notice (FUNCTIONAL, LLM-powered)

### Immigration
- uscis-notice — USCIS notice (FUNCTIONAL, LLM-powered)

### Credit Disputes (cross-listed from dispute-mail)
- transunion-dispute — TransUnion (FUNCTIONAL)
- experian-dispute — Experian (FUNCTIONAL)
- equifax-dispute — Equifax (FUNCTIONAL)

### LLM Integration
All workflows support multi-LLM analysis (Gemini default, OpenAI/Claude fallback).
Upload a notice → LLM analyzes document → extracts facts/deadlines/requirements → generates response draft.
