<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Toimi-specific gotchas (found the hard way — don't rediscover these)

- **Prisma is v7.** No bundled query engine binary anymore — `PrismaClient` requires an
  explicit driver adapter. We use `@prisma/adapter-pg` (`src/lib/db.ts`). Also:
  connection config lives in `prisma.config.ts` (not `datasource.url` in
  `schema.prisma`), and the generator is `provider = "prisma-client"` with a custom
  `output` — import from `@/generated/prisma/client`, not `@prisma/client`.
- **shadcn/ui here is built on Base UI, not Radix.** `<Button>` has no `asChild` prop —
  use `render={<Link href="..." />}` instead (Base UI's polymorphic pattern).
- **Auth is next-auth v4**, deliberately, not v5/Auth.js — v5 is still tagged `beta` on
  npm. Env var is `NEXTAUTH_SECRET`/`NEXTAUTH_URL` (v4 convention), adapter is
  `@next-auth/prisma-adapter` (not `@auth/prisma-adapter`, which pairs with v5).
- **OpenAI SDK usage goes through the Responses API** (`client.responses.parse`), not
  Chat Completions — see `src/lib/starter/openai.ts`. Structured output uses
  `zodTextFormat` from `openai/helpers/zod`.
- **This npm install has script-execution allowlisting** (`npm approve-scripts`) —
  a newer npm security default. If a new dependency needs its postinstall to run
  (native bindings, engine downloads), you'll see a warning; approve only that specific
  package, don't blanket-allow.
- Full phased plan and the roadmap for CRM/Quotes/Jobs/Invoices/etc. (not built yet) is
  in `../.claude/plans/twinkling-knitting-moth.md`.
