
DROP POLICY IF EXISTS "staff manage itinerary" ON public.booking_itinerary;
DROP POLICY IF EXISTS "staff manage rates" ON public.supplier_rates;
DROP POLICY IF EXISTS "staff manage departures" ON public.package_departures;
DROP POLICY IF EXISTS "staff manage checklist" ON public.booking_checklist;

CREATE POLICY "auth manage itinerary" ON public.booking_itinerary FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage rates" ON public.supplier_rates FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage departures" ON public.package_departures FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage checklist" ON public.booking_checklist FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
