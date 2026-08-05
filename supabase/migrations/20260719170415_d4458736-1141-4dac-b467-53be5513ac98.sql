
DROP FUNCTION IF EXISTS public.next_invoice_number(UUID);
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE n INTEGER; uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.invoice_counters(user_id, last_number) VALUES (uid, 1)
  ON CONFLICT (user_id) DO UPDATE SET last_number = public.invoice_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END; $$;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;
