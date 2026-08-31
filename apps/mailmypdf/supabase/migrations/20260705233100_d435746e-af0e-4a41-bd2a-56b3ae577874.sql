ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'failed_provider_submission';