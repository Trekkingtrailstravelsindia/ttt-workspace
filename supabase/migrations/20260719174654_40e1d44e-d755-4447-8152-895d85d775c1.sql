
-- Extend booking status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quoted' BEFORE 'confirmed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'deposit_paid' BEFORE 'confirmed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'travelling' AFTER 'confirmed';

-- Itinerary
CREATE TABLE public.booking_itinerary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  activities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_itinerary TO authenticated;
GRANT ALL ON public.booking_itinerary TO service_role;
ALTER TABLE public.booking_itinerary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage itinerary" ON public.booking_itinerary FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_itin_upd BEFORE UPDATE ON public.booking_itinerary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supplier rate cards
CREATE TABLE public.supplier_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'per_unit',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  season_start DATE,
  season_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_rates TO authenticated;
GRANT ALL ON public.supplier_rates TO service_role;
ALTER TABLE public.supplier_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage rates" ON public.supplier_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_rates_upd BEFORE UPDATE ON public.supplier_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Package departures
CREATE TABLE public.package_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.tour_packages(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  capacity INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, departure_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_departures TO authenticated;
GRANT ALL ON public.package_departures TO service_role;
ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage departures" ON public.package_departures FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_dep_upd BEFORE UPDATE ON public.package_departures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guest checklist
CREATE TABLE public.booking_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  item TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_checklist TO authenticated;
GRANT ALL ON public.booking_checklist TO service_role;
ALTER TABLE public.booking_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage checklist" ON public.booking_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_chk_upd BEFORE UPDATE ON public.booking_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
