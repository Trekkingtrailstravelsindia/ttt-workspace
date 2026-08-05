
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;
