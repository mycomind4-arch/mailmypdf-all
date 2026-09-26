-- Supports bounded scans for connector operations interrupted while running.
-- Reconciliation never repeats the original action; unresolved operations move
-- to waiting_for_user through the existing guarded transition trigger.

create index if not exists connector_operations_stale_running_idx
  on public.connector_operations(updated_at, id)
  where state = 'running';
