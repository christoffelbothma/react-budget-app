# BudgetR

A React budget tracker backed by Convex.

## Features

- Installable PWA with automatic service-worker updates and offline app-shell support
- Import one to three months of bank-export CSV or text-based PDF statements
- South African-friendly merchant auto-categorisation with a review step
- Duplicate-safe imports; credits are excluded from expense tracking
- Interactive category, six-month trend and weekly spending charts
- Email/password authentication and realtime per-user data through Convex

## Run locally

```bash
npm install
npm run convex:dev
```

In a second terminal:

```bash
npm run dev
```

The Convex CLI writes the development deployment details to `.env.local`.

For an installable production-like build:

```bash
npm run build
npm run preview
```

## Bank statement imports

Export CSV files or text-based PDF statements from online banking, then choose **Import statements** in BudgetR. You can select up to three files covering no more than three months. Files are parsed in your browser and are not sent to a separate document-processing service.

The importer recognises common variations of:

- Date: `Date`, `Transaction Date`, `Posting Date`, `Value Date`
- Description: `Description`, `Details`, `Narrative`, `Reference`, `Memo`
- Spend: `Debit`, `Withdrawals`, `Money Out`, or a signed `Amount`
- Income: `Credit`, `Deposits`, `Money In` (ignored)

Always review the detected category and selected rows before importing.

Scanned/image-only and password-protected PDFs cannot be read. Download a text-based PDF or CSV from the bank instead.

## Backend

Convex provides:

- Email and password authentication
- Per-user transactions and debit orders
- Realtime queries for dashboard updates
- Protected mutations for all writes
- Default categories and a monthly budget for new accounts
- Idempotent monthly debit-order creation

The legacy Supabase schema remains in `supabase-schema.sql` as a migration reference.

## Supabase data migration

Supabase passwords cannot be transferred. Create the corresponding user in BudgetR with the same email address before importing that user's data.

The migration mutation in `convex/migrations.js` accepts exported transactions and debit orders, retains each Supabase UUID as `legacyId`, and ignores rows that were previously imported.
