# Perfection Method Selection Document Templates

## Purpose

Stores source templates for correspondence, schedules, exhibits, declarations, checklists, or other workflow-created documents.

## Planned files

| Future file or directory | Function |
| --- | --- |
| `<template-id>.md` | Human-readable source template when Markdown is sufficient. |
| `<template-id>.tsx` | Programmatic template when layout or conditional rendering requires code. |
| `template-registry.ts` | Typed registry of templates, required data, and packet placement. |

## Boundary

This directory should contain only files owned by this layer. Reusable security, document intake, document intelligence, AI execution, provenance, workflow runtime, packet generation, pricing, payment, fulfillment, and general UI behavior belong in shared packages rather than being duplicated here.
