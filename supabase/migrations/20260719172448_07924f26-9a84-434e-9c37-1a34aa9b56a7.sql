
-- Expense category enum
CREATE TYPE public.expense_category AS ENUM ('booking','transport','stay','activities','igloo','train','other');

-- Expenses table
CREATE TABLE public.booking_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  category public.expense_category NOT NULL DEFAULT 'other',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_expenses TO authenticated;
GRANT ALL ON public.booking_expenses TO service_role;
ALTER TABLE public.booking_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses" ON public.booking_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX booking_expenses_booking_idx ON public.booking_expenses(booking_id);
CREATE TRIGGER update_booking_expenses_updated_at
  BEFORE UPDATE ON public.booking_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents table (metadata; files live in storage)
CREATE TABLE public.booking_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_documents TO authenticated;
GRANT ALL ON public.booking_documents TO service_role;
ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own documents" ON public.booking_documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX booking_documents_booking_idx ON public.booking_documents(booking_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_expenses;
