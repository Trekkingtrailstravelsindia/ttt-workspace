
-- Phase 3: installments, multi-currency, cash flow, commissions

-- Multi-currency on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'EUR';

-- Installment schedule per booking
CREATE TABLE IF NOT EXISTS public.booking_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_installments TO authenticated;
GRANT ALL ON public.booking_installments TO service_role;
ALTER TABLE public.booking_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage installments" ON public.booking_installments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_bi_updated BEFORE UPDATE ON public.booking_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commissions (agents / resellers)
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_contact TEXT,
  rate_percent NUMERIC,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage commissions" ON public.commissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_com_updated BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supplier payables (expected outflows) - used for cash flow forecast
CREATE TABLE IF NOT EXISTS public.supplier_payables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payables TO authenticated;
GRANT ALL ON public.supplier_payables TO service_role;
ALTER TABLE public.supplier_payables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage payables" ON public.supplier_payables
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pay_updated BEFORE UPDATE ON public.supplier_payables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
