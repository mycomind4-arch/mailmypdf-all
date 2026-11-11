# Minimal Mail Core — mock-only prototype

Run `node --test rebuild/mail-core/test/*.test.mjs` from the repository root (Node 20+).

This isolated module has no network calls and cannot charge or mail. It proves the basic review → exact-packet approval → mock checkout → mock verified payment → single mock submission state transition in memory.

**NOT production ready:** PDF signature check is not full PDF parsing or malware scanning; there is no authentication middleware, persistence, transactional locking, verified Stripe/Lob webhook signatures, pricing provider, real PDF rendering, UI, or deployed endpoint. Do not wire to real providers until these gates are implemented and tested.
