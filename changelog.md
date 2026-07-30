# Changelog

## 1.0.4

- Fixed PDF statement imports on iPhone and older Safari versions.
- Added support for FNB statement PDFs with Amount and Balance columns.
- Corrected credit/debit detection for balances ending in `Cr`, `Dr`, or `Db`.

## 1.0.3

- Added an in-app confirmation when a newer BudgetR version is ready.
- Users can install the update immediately or defer it until later.

## 1.0.2

- Added private, on-device text extraction for PDF bank statements.
- Added Standard Bank-friendly PDF column detection and expanded CSV header/preamble support.
- Added clear guidance for scanned, password-protected, oversized, or unsupported statements.

## 1.0.1

- Replaced internal Convex authentication errors with clear, user-friendly login messages.
- Fixed the mobile navigation drawer position, safe-area spacing, scrolling, and sign-out access on iPhone-sized screens.

## 2026-07-30

- Added installable PWA support with generated app icons and offline caching.
- Added three-month CSV bank statement import, automatic categorisation, review editing, and duplicate protection.
- Rebuilt the dashboard with interactive category, monthly trend, and weekly charts.

## Unreleased

- Replaced Supabase authentication and database calls with Convex.
- Added protected Convex queries and mutations for transactions and debit orders.
- Added realtime dashboard updates and idempotent monthly debit-order creation.
- Added a safe, repeatable Supabase data-import mutation.

## 1.0.0 - 2026-06-02

- Added Supabase authentication with login, registration, and email verification.
- Added per-user transaction tracking backed by Supabase row-level security.
- Added dashboard, month calendar, products, and quick-add screens.
- Added dark and light mode support on the login screen.
- Added collapsible side navigation for desktop and mobile.
- Added product spend summaries with detail modals.
- Added empty states for new users with no captured spending.
- Added Supabase schema for profiles, budget months, categories, and transactions.
- Added monthly spend summaries sorted from most expensive to least expensive.
- Added expanded product catalog with tags and Savings products.
- Added debit order tracking with category grouping and auto-add monthly support.
- Added Supabase schema support for transaction tags, transaction category text, and debit orders.
