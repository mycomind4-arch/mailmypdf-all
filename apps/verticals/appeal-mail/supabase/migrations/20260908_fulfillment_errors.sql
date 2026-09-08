-- Needed by the canonical MailingIntentStore error/retry updates.
ALTER TABLE public.mailings ADD COLUMN IF NOT EXISTS error_message text;
