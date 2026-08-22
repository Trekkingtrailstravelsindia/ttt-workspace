-- Add kids column to bookings table to track total children in the booking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS kids integer DEFAULT 0;

-- Add comment documenting the field
COMMENT ON COLUMN public.bookings.kids IS 'Number of children/kids in this booking';
