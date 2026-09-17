# SSDI official form assets

This workflow keeps two representations of each bundled SSA form for different purposes.

- `generated/ssa-561-u2.pdf`, `generated/ssa-3441.pdf`, and `generated/ssa-827.pdf` are the original official source files retained for provenance and user-facing download references.
- `generated/ssa-561-u2.normalized.pdf`, `generated/ssa-3441.normalized.pdf`, and `generated/ssa-827.normalized.pdf` are immutable mail-ready static copies used by packet assembly and acceptance tests.

The mail-ready copies exist because the public SSA PDFs contain structures that `pdf-lib` cannot reliably traverse during deterministic packet assembly. They were rewritten once from the official source files into ordinary unencrypted PDFs. Runtime packet assembly must not attempt to repair arbitrary user uploads.

User-uploaded documents continue through the shared secure intake, scanning, integrity, and strict PDF-validation boundaries. Encryption, active content, malformed structures, and hash mismatches remain fail-closed.

The relationship between an official source filename and its bundled mail-ready filename is declared by `start/workflow.ts` in `SSDI_REQUIRED_FORMS`.
