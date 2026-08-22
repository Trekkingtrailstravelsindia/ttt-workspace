-- Add kids column to booking_expenses table
ALTER TABLE public.booking_expenses ADD COLUMN IF NOT EXISTS kids integer;

-- Add comment documenting the field
COMMENT ON COLUMN public.booking_expenses.kids IS 'Number of children/kids for this expense, used alongside guests (adults)';
