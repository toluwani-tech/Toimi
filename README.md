# Toimi

Finnish-language SaaS platform for tradespeople: an AI business-starter advisor, customer
management (CRM), quoting, job/schedule tracking, invoicing with payment tracking (incl.
credit notes and estimated late-fee interest), expense tracking, business reports, an
in-app AI copilot, and a platform-wide admin dashboard.
This repo currently covers **Phase 0 (foundation)** through **Module 13 (Admin
Dashboard)**, plus a credit-notes/late-fee-interest follow-up to Invoices — see
[twinkling-knitting-moth.md](../.claude/plans/twinkling-knitting-moth.md) for the full
phased plan and roadmap of the remaining modules.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS + shadcn/ui (Base UI primitives) ·
Prisma 7 + PostgreSQL (Neon) · Auth.js v4 (credentials + Google) · OpenAI (Responses API) ·
`@react-pdf/renderer` (quote/invoice PDFs)

## Prerequisites

- Node.js 20.9+ (LTS recommended)
- A PostgreSQL database — either:
  - [Neon](https://neon.tech) free tier (recommended for anything beyond solo local dev), or
  - `npx prisma dev` — Prisma's own local dev Postgres, zero account needed. Prints a
    `DATABASE_URL` to use; keep it running in another terminal (or `-d` to background it).
    See the connection-pooling note below if using this option.
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in real values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Required for | Notes |
   |---|---|---|
   | `DATABASE_URL` | everything | Postgres connection string, e.g. from Neon |
   | `NEXTAUTH_SECRET` | auth | A random secret; a dev value is pre-filled, replace for anything shared/deployed |
   | `NEXTAUTH_URL` | auth | `http://localhost:3000` in dev |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | Optional — leave blank to disable the Google button |
   | `OPENAI_API_KEY` | AI Starter advisor | Required for `/starter` to work |
   | `OPENAI_MODEL` | AI Starter advisor | Optional override; defaults to `gpt-5.4-mini` (verified available as of 2026-07) — check current availability on your account and adjust if needed |

3. Apply the schema to your database:

   ```bash
   npx prisma migrate dev --name init
   ```

   If you're using `npx prisma dev`'s local server, `migrate dev` may fail with `P1017
   Server has closed the connection` — that's a shadow-database quirk of the local dev
   proxy, not your schema. Use `npx prisma db push` instead in that case (applies the
   schema directly, no migration history file). Against Neon or any real Postgres,
   `migrate dev` works normally and is what you want for real migration history.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000). The landing page, `/signup`,
   `/login`, the free `/starter` AI advisor, `/app/customers`, `/app/quotes`, `/app/jobs`,
   `/app/schedule`, `/app/invoices`, `/app/expenses`, `/app/reports`, and `/app/copilot`
   should all work once the env vars above are set.

### Platform admin access

`/admin` (companies, users, and platform-wide stats across every tenant) has no
self-service way to reach it — it's gated by `User.isPlatformAdmin`, which is `false` for
everyone by default and isn't exposed anywhere in the UI. To make an account a platform
admin, run this once against your database after signing up:

```bash
npx prisma studio
# or: npx prisma db execute --stdin, then:
# UPDATE "User" SET "isPlatformAdmin" = true WHERE email = 'you@example.com';
```

### Local dev database connection pooling

If you're using `npx prisma dev`'s local proxy, `src/lib/db.ts` automatically caps the
connection pool to 1 (`max: 1`) when `DATABASE_URL` contains `localhost`. That proxy has a
bug where concurrent pooled connections can hit `DriverAdapterError: bind message supplies
N parameters, but prepared statement requires M` — a race in the proxy's handling of
unnamed prepared statements, not in this app's queries or Prisma's adapter. The cap only
applies to `localhost` URLs; a real hosted Postgres (Neon, etc.) in production is not
artificially limited.

## Testing

```bash
npm run test        # Vitest — unit tests for state machines, pure calculations, schemas
npm run test:e2e     # Playwright — full anonymous-chat-to-plan smoke test
npm run verify       # Browser-driven smoke check of auth/RBAC/CRM/Quotes, no OpenAI key needed
```

The Playwright test hits the real OpenAI API and a real database (no mocks — that's the
point of a smoke test), so it auto-skips unless `DATABASE_URL` and `OPENAI_API_KEY` are
both configured with real values.

`npm run verify` (`scripts/verify.mjs`) only needs `DATABASE_URL` — it drives a real
Chromium browser through the landing page, theme toggle, `/app` RBAC redirect, anonymous
`/starter` session + cookie persistence, signup → login → dashboard, duplicate-signup
error handling, full customer CRUD (create/list/detail/note/edit/delete), a full quote
lifecycle (create with line items → verify computed totals → download and validate the PDF
→ mark sent → accept → confirm a non-DRAFT quote can't be edited), a full job lifecycle
(create with an initial task → appears in the list and on the week schedule → toggle a
task → walk SCHEDULED → IN_PROGRESS → COMPLETED → confirm a COMPLETED job can't be edited
→ convert an accepted quote into a job), and a full invoice/payment lifecycle (create with
line items → mark sent → record a partial payment and confirm status stays SENT with the
correct remaining balance → record a second payment that completes the total and confirm
status auto-flips to PAID → download and validate the PDF → create an invoice from the
same accepted quote and confirm it's pre-filled correctly, independent of the job already
created from it), a full expense lifecycle (create an expense linked to an existing job →
confirm it appears in the list and in the "this month" stats total → edit its description
→ delete it), a reports check (create one more persisted expense linked to the
quote-converted job → confirm the expense-category breakdown, top-customers table, and
job-profitability figures on `/app/reports` match hand-computed expected values), a
copilot check (send a message on `/app/copilot` and confirm the app doesn't crash whether
the call succeeds or falls back to the friendly 502 → confirm message history persists
across a reload), and a credit-notes/late-fee check (create an overdue, unpaid invoice →
confirm the overdue badge and an estimated late-fee interest line both appear → create a
credit note against it → confirm the balance due drops by exactly the credited amount and
its PDF downloads validly), and an admin dashboard check (confirm `/admin` redirects a
regular user → flip `isPlatformAdmin` for the test user directly via SQL, the only way to
reach it → confirm `/admin` now loads and shows the test company and test user). It
intentionally doesn't need `OPENAI_API_KEY` for the
starter/copilot checks to pass (both accept a friendly 502 without a key), so it's the
fast/cheap way to confirm everything except the AI itself works — though when a real key
is configured (as in this repo's `.env`), the copilot check exercises a real OpenAI
round-trip grounded in the actual seeded data.

Note: the dev server occasionally surfaces a one-off `Failed to fetch` on a Server Action
that actually completes successfully server-side (confirmed via direct DB checks) — a
Turbopack/dev-server timing quirk, not an app bug. `scripts/verify.mjs`'s
`clickAndWaitForUrl` helper retries once to absorb this; if you see it fail twice in a row,
that's worth investigating for real.

If you restart the dev server often during a long session, kill it by PID specifically
(`taskkill /F /PID <pid>`) rather than `/IM node.exe` (which would also kill the Prisma
dev database process). On Windows, killing a single PID doesn't cascade to its child
processes, so orphaned Turbopack/Node workers can accumulate over many restarts and
eventually cause an out-of-memory crash — if things get sluggish, check `Get-Process node`
and clean up strays (excluding the Prisma dev DB's PID).

## Other useful commands

```bash
npm run lint          # ESLint
npx tsc --noEmit       # Typecheck
npx prisma studio      # Browse the database
```

## Project structure

```
src/
  app/
    (auth)/login, (auth)/signup   — auth pages (route group, no URL prefix)
    app/                          — authenticated shell (requires sign-in)
      customers/                  — CRM: list, create, detail (+ notes), edit
      quotes/                     — Quotes: list, create, detail (+ status actions), edit, PDF route
      jobs/                       — Jobs: list, create, detail (+ status, tasks), edit
      schedule/                   — week-view schedule (plain grid, no calendar library)
      invoices/                   — Invoices: list (+ stats), create, detail (+ payments), edit, PDF route
        credit-notes/, [id]/credit-notes/  — credit note actions/PDF route + creation page
      expenses/                   — Expenses: list (+ stats), create, edit, inline delete
      reports/                     — Reports: monthly revenue/expenses, category breakdown, top customers, job profitability
      copilot/                     — AI Copilot chat page
    admin/                       — platform-wide dashboard: companies, users, stats (gated by isPlatformAdmin)
    starter/                      — free AI Business Starter chat
    api/auth/[...nextauth]        — Auth.js route handler
    api/starter/{chat,plan}       — AI Starter endpoints
    api/copilot/chat               — AI Copilot chat endpoint
  components/
    ui/                                              — shadcn/ui primitives
    starter/, customers/, quotes/, jobs/, invoices/, expenses/, copilot/  — feature-specific components
  lib/
    auth.ts, rbac.ts, db.ts       — auth config, RBAC guards, Prisma client
    money.ts                      — shared line-item totals math (Quotes + Invoices)
    starter/                      — knowledge base, state machine, OpenAI wrapper, schemas
    customers/                    — customer form validation
    quotes/                       — status transitions, schemas, PDF generation
    jobs/                         — status transitions, schemas
    invoices/                     — status transitions (incl. derived overdue), schemas, PDF generation,
                                     credit-note PDF generation, late-fee interest estimate
    expenses/                     — schema (no status workflow — see plan doc for why)
    reports/                     — pure aggregation functions (monthly buckets, category sums)
    copilot/                     — business-data snapshot, system prompt, OpenAI wrapper
prisma/schema.prisma              — data model (see plan doc for why receipt photo
                                     upload/S3 isn't modeled yet)
e2e/                              — Playwright specs
scripts/verify.mjs                — browser-driven smoke check (see Testing above)
```
