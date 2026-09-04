-- Website Bookings inbox: staging table that the public sites write into
-- (paid Stripe bookings + leads). Staff triage these in the CRM and convert
-- them into full bookings. Kept separate from the normalised bookings table so
-- inbound web data never has to satisfy customer/package/user foreign keys.

create table if not exists public.website_bookings (
  id uuid primary key default gen_random_uuid(),
  site text not null,                       -- 'lapland' | 'india' | 'ruka' | 'soulvia' | 'rovaniemi' | 'trekking'
  kind text not null default 'lead',        -- 'paid' | 'lead'
  customer_name text,
  customer_email text,
  customer_phone text,
  package_title text,
  departure text,
  travel_date text,
  adults integer default 1,
  kids integer default 0,
  amount numeric(12,2),
  currency text default 'EUR',
  payment_status text,                      -- 'paid' | 'pending' | null
  source text,                              -- 'stripe' | 'formspree' | 'whatsapp' | 'website'
  stripe_session_id text,
  external_ref text,
  notes text,
  raw jsonb,
  status text not null default 'new',       -- 'new' | 'converted' | 'archived'
  converted_booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.website_bookings enable row level security;

-- Public sites insert with the anon/publishable key (insert-only, cannot read).
drop policy if exists "website insert" on public.website_bookings;
create policy "website insert" on public.website_bookings
  for insert to anon, authenticated with check (true);

-- Staff (authenticated) can read / update / delete inbox entries.
drop policy if exists "staff read website_bookings" on public.website_bookings;
create policy "staff read website_bookings" on public.website_bookings
  for select to authenticated using (true);

drop policy if exists "staff update website_bookings" on public.website_bookings;
create policy "staff update website_bookings" on public.website_bookings
  for update to authenticated using (true) with check (true);

drop policy if exists "staff delete website_bookings" on public.website_bookings;
create policy "staff delete website_bookings" on public.website_bookings
  for delete to authenticated using (true);

create index if not exists website_bookings_created_at_idx on public.website_bookings (created_at desc);
create index if not exists website_bookings_status_idx on public.website_bookings (status);
create index if not exists website_bookings_site_idx on public.website_bookings (site);
