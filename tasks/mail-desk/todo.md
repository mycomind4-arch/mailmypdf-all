# Mail Desk implementation

Approved scope and dependency order: [spec](spec.md).

- [x] Shared status projection; tests for known and unknown states.
- [x] Sending-first dashboard with real records and explicit loading/error states.
- [x] Full document review, stale-upload protection, approval invalidation.
- [x] Authorized record downloads with an explicit field allowlist (handler/response tests).
- [x] Targeted regression, build, browser review, and limitations ledger.
- [ ] Full repository typecheck/test suite green (unrelated failures recorded).
- [ ] Real order download and sandbox payment/fulfillment end-to-end verification.

See [verification.md](verification.md) for implemented versus verified scope.

Keep concurrent Studio and vertical work intact. No live payment or mailing.
