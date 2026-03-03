# LuxGo Finance

Swiss tax and accounting web app for **LuxGo GmbH** and personal tax management (Dejan).

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Forms:** React Hook Form + Zod
- **Dates:** date-fns

## Getting Started

1. Clone the repo
2. Copy `.env.local.example` → `.env.local` and fill in your Supabase credentials
3. Run the migration in `sql/001_init.sql` in your Supabase SQL editor
4. Install dependencies: `npm install`
5. Start dev server: `npm run dev`

## Database Setup

Run `sql/001_init.sql` in your Supabase project SQL editor to:
- Create all tables (profiles, tax_years, income, expenses, mwst_reports, documents)
- Enable Row Level Security (users can only access their own data)
- Create performance indexes

## Project Structure

```
app/
  dashboard/
    income/        # Income records (transport, charter, other)
    expenses/      # Expense records (vehicle, fuel, insurance, etc.)
    mwst/          # MWST (VAT) quarterly reports
    tax-year/      # Tax year management
    documents/     # Document uploads (receipts, invoices, tax forms)
components/
  ui/              # shadcn/ui components
  forms/           # Form components
  tables/          # Table components
lib/
  supabase.ts      # Supabase client
  helpers/
    vat.ts         # Swiss VAT (MWST) calculations
    tax.ts         # Swiss income tax estimations
sql/
  001_init.sql     # Database migration
types/
  index.ts         # TypeScript types matching DB schema
```

## Swiss VAT Notes

- Standard rate: **8.1%** (2024)
- Reduced rate: **2.6%** (food, books, medicine)
- Special rate: **3.8%** (accommodation)
- Passenger transport companies may use **Saldosteuersatz** (3.8% flat)

## Features (Planned)

- [ ] Multi-profile support (LuxGo GmbH + personal)
- [ ] Income & expense tracking with Swiss VAT
- [ ] MWST quarterly report generation (Form 300)
- [ ] Document upload & Supabase Storage
- [ ] Tax year management
- [ ] Swiss income tax estimation
- [ ] PDF export
- [ ] Dashboard with financial overview

## Profiles

- **LuxGo GmbH** — Business profile, CHE-xxx.xxx.xxx MWST registered
- **Dejan** — Personal tax profile

---

Built with ❤️ for LuxGo Switzerland
