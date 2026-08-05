
-- 1. Role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'ops');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all staff read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + auto-grant first user admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, split_part(email,'@',1) FROM auth.users
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;

-- 3. assigned_to on bookings + customers
ALTER TABLE public.bookings ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE public.customers ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- Update RLS: admins/ops see all, sales sees own + unassigned
DROP POLICY IF EXISTS "Users manage own bookings" ON public.bookings;
CREATE POLICY "staff read bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
    OR user_id = auth.uid()
  );
CREATE POLICY "staff insert bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
    OR assigned_to = auth.uid()
    OR user_id = auth.uid()
  );
CREATE POLICY "admins delete bookings" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own customers" ON public.customers;
CREATE POLICY "staff read customers" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
    OR assigned_to = auth.uid()
    OR assigned_to IS NULL
    OR user_id = auth.uid()
  );
CREATE POLICY "staff write customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'ops')
    OR assigned_to = auth.uid()
    OR user_id = auth.uid()
  );
CREATE POLICY "admins delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- 4. booking_activity audit log
CREATE TABLE public.booking_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_activity TO authenticated;
GRANT ALL ON public.booking_activity TO service_role;
ALTER TABLE public.booking_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read activity for accessible bookings" ON public.booking_activity
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id));
CREATE POLICY "staff insert activity" ON public.booking_activity
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_booking_activity_booking ON public.booking_activity(booking_id, created_at DESC);

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.log_booking_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bid UUID;
  ent TEXT := TG_TABLE_NAME;
  act TEXT := lower(TG_OP);
BEGIN
  IF TG_TABLE_NAME = 'bookings' THEN
    bid := COALESCE(NEW.id, OLD.id);
  ELSE
    bid := COALESCE(NEW.booking_id, OLD.booking_id);
  END IF;

  INSERT INTO public.booking_activity (booking_id, actor_id, action, entity, details)
  VALUES (bid, auth.uid(), act, ent, jsonb_build_object(
    'new', CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END
  ));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER log_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_change();
CREATE TRIGGER log_booking_expenses AFTER INSERT OR UPDATE OR DELETE ON public.booking_expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_change();
CREATE TRIGGER log_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_change();

-- 5. booking_notes
CREATE TABLE public.booking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.booking_notes TO authenticated;
GRANT ALL ON public.booking_notes TO service_role;
ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read notes" ON public.booking_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id));
CREATE POLICY "staff write own notes" ON public.booking_notes
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "authors delete own notes" ON public.booking_notes
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_booking_notes_booking ON public.booking_notes(booking_id, created_at DESC);
