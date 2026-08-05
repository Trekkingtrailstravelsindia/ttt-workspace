# Trekking Trails Travels Workspace

Tour operator CRM for managing Finland tour bookings, customers, packages, and invoices.

**Tech Stack:**
- Frontend: React 19 + TanStack Router + Tailwind CSS 4
- Backend: TanStack Start (Nitro SSR) + Supabase PostgreSQL
- Database: Supabase (PostgreSQL + Auth)

## Development

**Prerequisites:**
- Node.js 22+ (using nvm recommended)
- npm or yarn

**Setup:**

```bash
# Install dependencies
npm install

# Copy .env.example to .env and fill in your Supabase keys
cp .env.example .env

# Run dev server (http://localhost:8080)
npm run dev
```

**Build for production:**

```bash
npm run build
npm run preview
```

## Environment Variables

See `.env.example` for all required variables. Key variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` - Anon key for client-side auth
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations (Vercel only)

## Deployment

**Vercel (Recommended):**

1. Push this repo to GitHub
2. Connect to Vercel via GitHub
3. Set environment variables in Vercel Dashboard
4. Deploy

The app automatically uses `NITRO_PRESET=vercel` for proper serverless function output.

**Custom Domain:**

Add a CNAME record pointing to Vercel:
```
workspace.trekkingtrailstravels.com → cname.vercel.com
```

Then configure the domain in Vercel Dashboard.

## Features

- **Staff Management** - User roles (admin, sales, staff)
- **Bookings** - Create, manage, and track tour bookings
- **Customers** - Customer database with contact info
- **Packages** - Tour package catalog (19 Finland tours)
- **Invoices** - Generate and manage invoice PDFs
- **Financials** - Admin-only cash flow and reports (locked)
- **Activity Tracking** - Employee time tracking and analytics
- **Command Palette** - Global ⌘K search (bookings, customers, packages, invoices)

## Default Credentials

Staff accounts are created in Supabase (see `supabase/migrations/`):

- Email: `info@trekkingtrailstravels.com` (admin)
- Email: `krishsingh303@gmail.com` (admin + sales)
- Email: `sales@trekkingtrailstravels.com` (sales)
- Password: `KRISHNA143@Aa` (change after first login)

## Support

For issues or questions, contact the Trekking Trails Travels team.
