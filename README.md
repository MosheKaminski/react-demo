# Employee & Branch Management

A web app for managing branches, employees, attendance, shift scheduling, and
payroll (with Israeli-labor-law overtime calculation) for a small/medium
business. See [PRD.md](PRD.md) for the full product spec and [TASKS.md](TASKS.md)
for the milestone-by-milestone build log.

## Stack

- **Frontend:** React + Vite + TypeScript, MUI (with RTL support), i18next (Hebrew/English), TanStack Query
- **Backend:** Supabase — PostgreSQL with Row Level Security, Auth, Storage, and one Edge Function (`calculate-payroll`)
- **Hosting:** Vercel (frontend), Supabase (backend), both auto-deploying from `master`

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

### Environment variables (`.env.local`, never committed)

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend (browser) | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend (browser) | Public/publishable anon key |
| `SUPABASE_URL` | scripts (`npm run seed`, `npm run verify-rls`) | Same project URL, no `VITE_` prefix since these run in Node, not the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts only | Service-role key — bypasses RLS, **never** ship this to the browser |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `npm run seed` | Credentials for the admin user the seed script creates |

Find the URL and keys in the Supabase dashboard under Project Settings → API.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck (`tsc -b`) and build for production |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests (overtime/payroll calculation logic) |
| `npm run seed` | Seed a dev Supabase project with an admin, a branch_manager, an employee, and two branches |
| `npm run verify-rls` | Sign in as each seeded role and assert Row Level Security actually enforces the access matrix in [PRD.md](PRD.md#2-users--roles) |

## Database changes

Schema lives in `supabase/migrations/*.sql`. To apply pending migrations to the
linked Supabase project:

```bash
npx supabase link --project-ref <your-project-ref>   # once
npx supabase db push
```

Docker isn't required to push migrations or deploy Edge Functions in this
setup — only `supabase start` (full local Postgres) needs it, which this
project doesn't rely on; all development happens against a real hosted
Supabase dev project instead.

## Edge Functions

The payroll calculation runs server-side in `supabase/functions/calculate-payroll`.
Deploy changes with:

```bash
npx supabase functions deploy calculate-payroll
```

The pure calculation logic (`payroll-logic.ts`) has zero Deno/Node-specific
imports, so the same file is both deployed to the Edge Function and
unit-tested directly from Node (`npm run test`) — no duplication.

## Deployment

- **Frontend:** pushing to `master` auto-deploys to Vercel (already connected). Production environment variables are set in the Vercel project settings, not in this repo.
- **Backend:** migrations and Edge Function deploys are manual (`supabase db push` / `supabase functions deploy`) — there's no CI step for these yet; see TASKS.md Backlog.

## Test accounts (dev project, after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@react-demo.local` | `DevAdmin123!` |
| Branch Manager | `branch.manager@react-demo.local` | `DevManager123!` |
| Employee | `employee@react-demo.local` | `DevEmployee123!` |

## Project documents

- [PRD.md](PRD.md) — product requirements
- [TASKS.md](TASKS.md) — milestone plan and build log (what's done, what's simplified/deferred, and why)
