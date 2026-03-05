# LuxGo Finance

Swiss tax & accounting app for **LuxGo GmbH** — a passenger transport company based in Zurich.

Built with Next.js 14, Supabase, and shadcn/ui. Dark theme, mobile-friendly, production-ready.

---

## What it does

| Module | Features |
|--------|----------|
| **Income** | Track transport/charter revenue with MWST, invoice numbers, client records |
| **Expenses** | Log deductible/non-deductible costs by category (vehicle, fuel, salary, etc.) |
| **MWST** | Quarterly VAT reports, Swiss 60-day deadline tracking, submission status |
| **Tax Year** | Corporate tax estimate (Federal 8.5% + Cantonal ZH 7% + Municipal 119%) |
| **Personal Tax** | Progressive Swiss brackets, deduction wizard (3. Säule, transport, health) |
| **Documents** | Upload/preview/tag receipts, invoices, and tax forms in Supabase Storage |
| **Settings** | Profile editor, tax year manager, VAT preferences, CSV data export |

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Charts**: Recharts
- **Deploy**: Vercel
- **Notifications**: Sonner (toast)

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/luxgoch-bot/luxgo-finance.git
cd luxgo-finance
npm install
```

### 2. Supabase project

Create a project at [supabase.com](https://supabase.com), then run the migrations:

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"  # macOS
DB_URL="postgresql://postgres:[DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

psql "$DB_URL" -f sql/001_init.sql
psql "$DB_URL" -f sql/002_mwst_deadlines.sql
psql "$DB_URL" -f sql/003_settings_storage.sql
```

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run dev server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Create your account

Go to `/signup` → create account → `/setup` to configure your GmbH profile.

---

## Folder Structure

```
luxgo-finance/
├── app/
│   ├── dashboard/
│   │   ├── expenses/         # Expense tracking + CSV import
│   │   ├── income/           # Income tracking + invoice management
│   │   ├── mwst/             # MWST quarterly reports + deadline tracker
│   │   ├── tax-year/         # Business (GmbH) + Personal tax estimation
│   │   ├── documents/        # Document vault (upload, preview, tag)
│   │   └── settings/         # Profile, tax years, preferences, CSV export
│   ├── login/                # Email/password sign in
│   ├── signup/               # Account creation
│   ├── setup/                # First-run profile setup
│   └── actions/              # Server actions (auth, CRUD mutations)
├── components/
│   ├── ui/                   # shadcn/ui components + Skeleton, SkeletonTable
│   ├── forms/                # Income/expense/CSV import forms
│   ├── charts/               # Recharts wrappers (income/expense chart)
│   └── sidebar.tsx           # Navigation sidebar
├── lib/
│   ├── supabase-server.ts    # Server-side Supabase client (cookies)
│   ├── supabase.ts           # Browser-side Supabase client
│   ├── helpers/
│   │   ├── format.ts         # Swiss formatters: formatChf(), formatDateCh()
│   │   └── vat.ts            # VAT extraction helpers
│   └── utils.ts              # cn() class merge utility
├── sql/
│   ├── 001_init.sql          # Core schema: profiles, income, expenses, documents
│   ├── 002_mwst_deadlines.sql   # MWST periods, reminders, deadline rules
│   └── 003_settings_storage.sql # User settings + Supabase Storage bucket
├── types/
│   └── index.ts              # TypeScript interfaces matching DB schema
├── middleware.ts              # Auth middleware (public: /login, /signup, /auth)
└── .env.local.example        # Environment variable template
```

---

## Database Schema

9 tables in `public` schema, all with Row Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | GmbH or personal profile per user |
| `tax_years` | Fiscal years (open/submitted/closed) |
| `income` | Revenue records with MWST |
| `expenses` | Cost records with deductibility flag |
| `mwst_reports` | Quarterly VAT reports |
| `mwst_periods` | VAT period windows + deadlines |
| `mwst_reminders` | Notification delivery state |
| `mwst_deadline_rules` | Swiss 60-day submission rules (reference) |
| `documents` | File metadata (storage in Supabase bucket) |
| `user_settings` | VAT defaults + notification preferences |

Storage bucket: `luxgo-finance-docs` → `/{profile_id}/{year}/{type}/{filename}`

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Add env vars in the Vercel dashboard (Settings → Environment Variables) or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## Swiss Formatting

- **Dates**: `DD.MM.YYYY` (e.g. `15.03.2024`) via `formatDateCh()`
- **Currency**: `CHF 1'234.56` via `formatChf()` using `Intl.NumberFormat('de-CH')`
- **VAT**: Standard Swiss MWST 8.1% (reduced 2.6% for select goods)

---

## License

Private — LuxGo GmbH internal tool.
<!-- deploy: 2026-03-05T13:11:50Z -->
