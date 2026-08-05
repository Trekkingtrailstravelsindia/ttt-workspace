
-- Enums
CREATE TYPE public.booking_status AS ENUM ('inquiry','confirmed','completed','cancelled');
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customers" ON public.customers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tour packages
CREATE TABLE public.tour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,
  price_per_person NUMERIC(10,2) NOT NULL DEFAULT 0,
  location TEXT,
  season TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_packages TO authenticated;
GRANT ALL ON public.tour_packages TO service_role;
ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own packages" ON public.tour_packages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.tour_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE RESTRICT,
  package_id UUID NOT NULL REFERENCES public.tour_packages ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  travelers INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'inquiry',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings" ON public.bookings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoice number sequence per user
CREATE TABLE public.invoice_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_counters TO authenticated;
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own counter" ON public.invoice_counters FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.next_invoice_number(_user UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  INSERT INTO public.invoice_counters(user_id, last_number) VALUES (_user, 1)
  ON CONFLICT (user_id) DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO authenticated;

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE RESTRICT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invoices" ON public.invoices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX ON public.bookings(user_id, start_date);
CREATE INDEX ON public.invoices(user_id, issue_date);
CREATE INDEX ON public.customers(user_id);
CREATE INDEX ON public.tour_packages(user_id);
