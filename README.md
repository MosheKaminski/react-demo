# Employee & Branch Management

A web app for managing branches, employees, attendance, shift scheduling, and
payroll (with Israeli-labor-law overtime calculation) for a small/medium
business. See [PRD.md](PRD.md) for the full product spec and [TASKS.md](TASKS.md)
for the milestone-by-milestone build log.

**Live app:** https://react-demo-beta-eight.vercel.app
(see [Test accounts](#test-accounts-dev-project-after-npm-run-seed) below to log in)

## Stack

- **Frontend:** React + Vite + TypeScript, MUI (with RTL support), i18next (Hebrew/English), TanStack Query
- **Backend:** Supabase — PostgreSQL with Row Level Security, Auth, Storage, and two Edge Functions (`calculate-payroll`, `invite-employee`)
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

Two server-side functions, both admin-only (each checks the caller's role via
their own JWT before using the service-role key for privileged work):

| Function | Does |
|---|---|
| `calculate-payroll` | Aggregates approved attendance into regular/overtime hours and combines them with salary profiles + adjustments into payroll lines. The pure calculation logic (`payroll-logic.ts`) has zero Deno/Node-specific imports, so the same file is both deployed here and unit-tested directly from Node (`npm run test`) — no duplication. |
| `invite-employee` | Creates a Supabase Auth account for an employee (via `auth.admin.inviteUserByEmail`) and links it to `employees.user_id`. This is the only way to onboard a new login account — there's no open self-registration. |

Deploy changes with:

```bash
npx supabase functions deploy calculate-payroll
npx supabase functions deploy invite-employee
```

## Deployment

- **Frontend:** pushing to `master` auto-deploys to Vercel (already connected) at the Live app URL above. Production environment variables are set in the Vercel project settings, not in this repo. `vercel.json` adds a catch-all SPA rewrite (`/(.*) → /index.html`) — without it, any direct/hard navigation to a deep route (e.g. an emailed invite link landing on `/set-password`) 404s, since Vercel otherwise only serves real static files.
- **Backend:** migrations and Edge Function deploys are manual (`supabase db push` / `supabase functions deploy`) — there's no CI step for these yet; see TASKS.md Backlog. Auth settings (site URL, redirect URL allow-list) are pushed with `npx supabase config push`. Note: `supabase/config.toml`'s `site_url`/`additional_redirect_urls` are hardcoded to the Live app URL above — update them (then `config push`) if you deploy to a different URL, or invite/password-reset email links won't redirect anywhere valid.

## Test accounts (dev project, after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@react-demo.local` | `DevAdmin123!` |
| Branch Manager | `branch.manager@react-demo.local` | `DevManager123!` |
| Employee | `employee@react-demo.local` | `DevEmployee123!` |

## Project documents

- [PRD.md](PRD.md) — product requirements
- [TASKS.md](TASKS.md) — milestone plan and build log (what's done, what's simplified/deferred, and why)
