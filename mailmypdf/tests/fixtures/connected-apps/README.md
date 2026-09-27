# Connected-app controls: local browser fixture

Run from the repository root with the workspace Node runtime:

```sh
node node_modules/vite/bin/vite.js --config mailmypdf/tests/fixtures/connected-apps/vite.config.ts
```

Open `http://127.0.0.1:4197/`. This renders the real `ConnectedApps` component
with an in-memory API. Environment-file loading is disabled; it does not list
or revoke real grants. Do not add production credentials to this fixture.

Scenarios:

- `/`: connected app → disconnect confirmation → keep connected or confirm.
  Confirming removes the test app and shows success plus the empty state.
- `/?scenario=load-error`: first list fails; Refresh connections recovers.
- `/?scenario=revoke-error`: confirming fails; the app remains listed and the
  error explicitly says access may still be active. Internal error text is hidden.
- `/?scenario=empty`: no connected apps on initial load.

Verify pending buttons are disabled, feedback is announced using status/alert,
client IDs wrap, and the panel does not claim identity scopes enforce read-only
access. Check narrow and wide layouts. These fixture checks do **not** establish
hosted OAuth compatibility or instantaneous invalidation of existing JWTs.
