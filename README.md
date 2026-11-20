# معلّم · M3lem

A bilingual Moroccan artisan directory. Visitors can choose from **190 trades** and **385 cities and urban centres** across Morocco's 12 regions, or send a no-account **service request with up to three photos** from `/[lang]/request`; matching published artisans find it in their workspace inbox. The three fictional demo workshops are in Casablanca; other locations accept artisan registrations and display results when a profile is approved. See [national catalog scope and sources](docs/catalog.md) and [service requests](docs/features/service-requests.md).

## Run locally

Requires Node **22.16+**, npm, Supabase CLI (2.75 or compatible), and a running Docker daemon accessible to the CLI. Use a fresh, dedicated local project. From the repository root:

```sh
npm ci
supabase start
supabase db reset --local
cp .env.example .env.local
supabase status -o env
```

`db reset` **erases this local project's database** and reapplies the committed migrations. Copy the local `ANON_KEY` (or publishable key) into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SERVICE_ROLE_KEY` (or secret key) into `SUPABASE_SERVICE_ROLE_KEY`. Keep the other example settings for this setup. Then:

```sh
npm run seed:local
npm run dev
```

Visit **http://localhost:3000** for Darija, `/fr` for French, `/fr/request` for a no-account service request, `/fr/workspace` for the artisan workspace, or `/fr/admin` for staff. `supabase stop` stops the local services. Local email confirmation is disabled; production email configuration is separate.

Try `الما كيسرب` in Casablanca. On mobile the first results are visible above the collapsed search controls' expanded content. To test **Mot de passe oublié**, open the local inbox at **http://127.0.0.1:54324** and follow the email in the same browser. Use a new local account rather than changing a shared demo password.

| Local role | Email                    | Example                                                                            |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Artisan    | `artisan1@m3lem.example` | Plumbing in Casablanca; approved illustration, moderated sample review, free visit |
| Artisan    | `artisan2@m3lem.example` | Electricity and plumbing in Casablanca; fixed fee, expired availability            |
| Artisan    | `artisan3@m3lem.example` | Painting in Casablanca; unspecified fee, phone only, no reviews                    |
| Staff      | `staff@m3lem.example`    | Catalog, moderation, reports and review links                                      |

All four **local-only** passwords are `Atelier-local-2026!`. To try onboarding from scratch, create a new account on the account page. Demo contact controls are disabled; demo RPC results omit phone numbers. Seed availability naturally expires; sign in as artisan1 and confirm again for a fresh demonstration.

### Environment

| Variable                                                           | Purpose                                                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project endpoint and public client key                                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`                                        | Server-only credential for sanitized Storage operations and guarded public submissions                                   |
| `SITE_URL`                                                         | Absolute web origin for auth redirects, review links and SEO                                                             |
| `LOCAL_DEMO`                                                       | `1` explicitly enables the local fixture display; requires loopback site **and** project. Omit in deployed environments. |
| `LOCAL_DATABASE_URL`                                               | Loopback database connection for the seed script only                                                                    |
| `TRUSTED_CLIENT_IP_HEADER`                                         | Optional header overwritten by your trusted ingress with the client IP. Unset uses a shared anonymous submission budget. |

The seed command also checks the database URL and refuses to run against a populated directory. Database resets never seed demo identities automatically. The SVG under `scripts/` is an original illustration converted to private WebP assets by the local seed.

### Commands

| Command                                       | Purpose                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start` | Development server / production bundle / production server                                     |
| `npm run format` / `npm run format:check`     | Write / check formatting                                                                       |
| `npm run lint` / `npm run typecheck`          | ESLint / strict TypeScript including generated route types                                     |
| `npm test`                                    | Isolated database-role and business-rule tests; no services required                           |
| `npx playwright install chromium`             | Install the smoke-test browser                                                                 |
| `npm run test:browser`                        | Run against the seeded loopback project after `npm run build`; starts the web server as needed |
| `npm run db:types`                            | Generate `src/lib/database.generated.ts` from the local Supabase API schema                    |
| `npm run seed:local`                          | Provision local demo accounts, fixtures and portfolio art                                      |

## Documentation

- [Architecture and mobile integration](docs/architecture.md) · [Database model](docs/database.md) · [Auth and permissions](docs/auth-and-permissions.md)
- [Discovery and contact](docs/features/discovery.md) · [Service requests](docs/features/service-requests.md) · [Artisan workspace](docs/features/artisan-workspace.md) · [Administration and reviews](docs/features/admin-and-reviews.md)
- [Localization and accessibility](docs/ui-localization-accessibility.md) · [Deployment and operations](docs/deploy-and-operate.md)
- [Verification record](docs/testing.md) · [Roadmap](docs/roadmap.md) · [Implementation plan](docs/implementation-plan.md)
