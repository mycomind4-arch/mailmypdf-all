# DOCUMENTS TRUST MODEL

## @mailmypdf/documents

### Trust Boundary Overview

The documents package operates at the boundary between untrusted external input and trusted application data. Every document is treated as hostile until it has passed validation.

```
UNTRUSTED                    VALIDATION                    TRUSTED
┌─────────┐                ┌───────────┐                ┌─────────┐
│ Upload  │ → validateDoc → │ sanitize  │ → createDoc  → │ App     │
│ Mail    │    checkMIME    │ filename  │    hash       │ Data    │
│ External│    checkSize    │ validate  │    provenance │         │
│ AI      │    scanPDF      │ extract   │               │         │
└─────────┘                └───────────┘                └─────────┘
```

### Trust Levels

| Level | Source | Treatment |
|-------|--------|-----------|
| 0 — Hostile | Raw upload, mail attachment, external URL | Full validation, sanitization, security scan |
| 1 — Validated | Passed `validateDocument()` | Safe to store, safe to extract text from |
| 2 — Extracted | Passed extraction + `sanitizeExtractedText()` | Safe for AI consumption (with warnings) |
| 3 — Classified | Passed classification with confidence | Safe for vertical-specific processing |
| 4 — Analyzed | Passed vertical analysis | Safe for user presentation |
| 5 — Ready | Fully processed | Trusted for all downstream operations |

### Security Controls

1. **MIME Type Validation** — Only `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `text/plain` accepted. Dangerous types (JavaScript, HTML, executables, shell scripts) are rejected.

2. **PDF Security Scan** — Scans for forbidden PDF tokens (`/JavaScript`, `/JS`, `/Launch`, `/OpenAction`, `/RichMedia`, `/EmbeddedFile`, `/SubmitForm`, `/ImportData`, `/GoToE`). Rejects encrypted PDFs, missing headers, and missing EOF markers.

3. **Size Limits** — PDF: 10MB, Images: 5MB, Text: 1MB. Pages: max 20. Filename: max 255 chars.

4. **Path Traversal Prevention** — Filenames are sanitized: `..`, `/`, `\`, null bytes, and control characters are replaced with underscores. `isSafeFilename()` provides a separate validation check.

5. **SSRF Prevention** — `isSafeUrl()` rejects non-HTTPS, localhost, loopback, link-local, and private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, ::1).

6. **Prompt Injection Defense** — `sanitizeExtractedText()` detects and warns about common injection patterns ("ignore instructions", role reassignment, "system:" prefix, `[INST]` tokens). Warnings are preserved on the document record.

7. **Cryptographic Hashing** — SHA-256 content hash computed on creation. Used for duplicate detection and integrity verification.

### Provenance Contract

Every `DocumentRecord` carries a `DocumentProvenance` that records:
- `sourceId` — the platform ID of the source
- `sourceType` — upload, mailing, user-entry, external, or generated
- `uploadedAt` — ISO timestamp
- `uploadedBy` — optional user identifier
- `originalFilename` — pre-sanitization filename
- `sourceUrl` — optional external URL (validated with `isSafeUrl`)

Provenance survives versioning — new versions inherit the original provenance.

### AI Boundary

AI may extract, classify, summarize, suggest relationships, identify contradictions, and propose findings.

AI output must flow through:
```
AI extraction
  → structured schema (typed interface)
  → validation (package contracts)
  → provenance (SourceRef to document/page/offset)
  → confidence (explicit Confidence value)
  → application/business validation
  → stored result
```

AI output is never automatically promoted to authoritative fact. Extracted text is sanitized with `sanitizeExtractedText()` before AI consumption. Extraction warnings are preserved on the document record.

### Versioning Integrity

- Version history is append-only — previous version records are never modified.
- Each version records: version number, SHA-256 hash, size, timestamp, optional note.
- Hash computation is deterministic (SHA-256 of raw bytes).
- Provenance is inherited across versions.

### Relationship Integrity

- Relationships are typed (`supersedes`, `responds_to`, `evidence_for`, `evidence_against`, `appendix_of`, `attachment_of`, `references`, `derived_from`).
- Relationships store `fromDocumentId`, `toDocumentId`, type, and optional note.
- Relationships do not silently create invalid references — both document IDs must exist in the application layer.
