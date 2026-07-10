# Toimi

Finnish-language SaaS platform for tradespeople: an AI business-starter advisor plus (in
later phases) quoting, scheduling, and invoicing. This repo currently covers **Phase 0
(foundation)** and **Module 1 (AI Business Starter)** — see
[twinkling-knitting-moth.md](../.claude/plans/twinkling-knitting-moth.md) for the full
phased plan and roadmap of the remaining modules.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS + shadcn/ui (Base UI primitives) ·
Prisma 7 + PostgreSQL (Neon) · Auth.js v4 (credentials + Google) · OpenAI (Responses API)

## Prerequisites

- Node.js 20.9+ (LTS recommended)
- A PostgreSQL database — [Neon](https://neon.tech) free tier works well and needs no local install
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env` and fill in real values:

   | Variable | Required for | Notes |
   |---|---|---|
   | `DATABASE_URL` | everything | Postgres connection string, e.g. from Neon |
   | `NEXTAUTH_SECRET` | auth | A random secret; a dev value is pre-filled, replace for anything shared/deployed |
   | `NEXTAUTH_URL` | auth | `http://localhost:3000` in dev |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | Optional — leave blank to disable the Google button |
   | `OPENAI_API_KEY` | AI Starter advisor | Required for `/starter` to work |
   | `OPENAI_MODEL` | AI Starter advisor | Optional override; defaults to `gpt-5.5-mini` — verify this model is available on your account and adjust if not |

3. Run the first migration against your database:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000). The landing page, `/signup`,
   `/login`, and the free `/starter` AI advisor should all work once the env vars above
   are set.

## Testing

```bash
npm run test        # Vitest — unit tests for the starter state machine, prompt, and schemas
npm run test:e2e     # Playwright — full anonymous-chat-to-plan smoke test
```

The Playwright test hits the real OpenAI API and a real database (no mocks — that's the
point of a smoke test), so it auto-skips unless `DATABASE_URL` and `OPENAI_API_KEY` are
both configured with real values.

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
    starter/                      — free AI Business Starter chat
    api/auth/[...nextauth]        — Auth.js route handler
    api/starter/{chat,plan}       — AI Starter endpoints
  components/
    ui/                           — shadcn/ui primitives
    starter/                      — AI Starter plan view
  lib/
    auth.ts, rbac.ts, db.ts       — auth config, RBAC guard, Prisma client
    starter/                      — knowledge base, state machine, OpenAI wrapper, schemas
prisma/schema.prisma              — data model (auth, company/RBAC, AI starter — see plan
                                     doc for why CRM/Quotes/etc. aren't modeled yet)
e2e/                              — Playwright specs
```
