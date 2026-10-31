-- Activity Tracker: a per-guest booking checklist (one row per activity —
-- Husky Safari, Hotel in Helsinki, …) with dates, time, supplier, booked
-- Yes/No, cost and paid Yes/No. Auto-filled from a booking_trackers sheet,
-- then freely edited. The whole structured document lives in JSONB so the
-- format can evolve without migrations; a few columns are mirrored for
-- listing. Until this migration is applied the app stores sheets in the
-- browser's localStorage and upgrades to this shared table automatically.

CREATE TABLE IF NOT EXISTS public.activity_trackers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name         TEXT,
  package_name       TEXT,
  currency           TEXT NOT NULL DEFAULT 'EUR',
  source_tracker_id  UUID,
  data               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by         UUID DEFAULT auth.uid(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_trackers_guest_idx ON public.activity_trackers (guest_name);
CREATE INDEX IF NOT EXISTS activity_trackers_source_idx ON public.activity_trackers (source_tracker_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_trackers TO authenticated;
GRANT ALL ON public.activity_trackers TO service_role;
ALTER TABLE public.activity_trackers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity trackers staff" ON public.activity_trackers;
CREATE POLICY "activity trackers staff" ON public.activity_trackers
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'ops')
    OR public.has_role(auth.uid(),'sales')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'ops')
    OR public.has_role(auth.uid(),'sales')
  );

-- Keep updated_at fresh on every change.
CREATE OR REPLACE FUNCTION public.touch_activity_trackers()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS activity_trackers_touch ON public.activity_trackers;
CREATE TRIGGER activity_trackers_touch
  BEFORE UPDATE ON public.activity_trackers
  FOR EACH ROW EXECUTE FUNCTION public.touch_activity_trackers();
