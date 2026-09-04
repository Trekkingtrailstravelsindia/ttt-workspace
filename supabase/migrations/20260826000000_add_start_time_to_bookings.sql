-- Optional departure time for a booking (e.g. "18:00"). Nullable text.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time text;
