# Verification record

## Reproduce

Use Node 22.16 or newer and the local setup in the [README](../README.md). The SQL and model tests need no network service. Browser tests need the seeded **loopback** Supabase project, `.env.local`, a build and Chromium.

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright starts the production web server if necessary. Its setup reconfirms today's availability for the local plumbing fixture. The staff catalog test restores the original catalog row. The full workflow uses a new `@m3lem.example` identity, separate staff and visitor browser contexts, and cleans up its temporary identity and images. The local quotas also apply to tests: repeated runs within one hour can exhaust the shared report budget. Use a disposable reset for a fresh run. Failed traces under `test-results/` are private local artifacts; they can contain session information and one-time links.

## Coverage

| Flow                                                                                                                                   | Test / evidence                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Darija/French/Latin search, accent/spelling normalization, contact format, localized WhatsApp text, phone-only and inert demo contacts | `tests/model.test.ts`                                                                                                                                                                                                                                                             |
| Migration constraints and role matrix                                                                                                  | `tests/database.test.ts` runs the real migrations and seed SQL in PGlite, with minimal `auth.uid()`, `auth.users`, bucket and role fixtures. It switches database roles, not just UI flags.                                                                                       |
| Region membership, city results, availability and stale edits                                                                          | Every seeded city belongs to a known region. Tests check city filtering, removal of area fields, unapproved drafts vs live snapshots and changes to verified phone numbers.                                                                                                       |
| Day boundary                                                                                                                           | DB test uses the 2024 Ramadan offset change. Browser test advances across the next local midnight and dispatches `pageshow`; the badge disappears.                                                                                                                                |
| Ownership, media and abuse budgets                                                                                                     | Foreign attachment/removal rejected, published media visible, suspension revokes access, hourly limit enforced. HTTP smoke test checks actual PostgREST and Storage permissions.                                                                                                  |
| Consent and moderation                                                                                                                 | Create/edit, request corrections, reapprove, withdraw consent, suspend; invisible media and unauthorized publication verified in SQL and/or UI.                                                                                                                                   |
| Reviews                                                                                                                                | Expiry, failed-insert rollback, single use, pending visibility and approved aggregates in SQL. Browser issues, submits, rejects reuse and publishes an actual invitation.                                                                                                         |
| Discovery navigation and layout                                                                                                        | 360×800 Chromium: region-first selection, city reset when switching regions, legacy neighborhood URL cleanup, RTL/LTR switching, return URL, keyboard skip link and no horizontal overflow.                                                                                       |
| Staff catalog UI                                                                                                                       | Change a trade alias, discover by alias, archive and check the listing disappears; restore the original row.                                                                                                                                                                      |
| Desktop lifecycle                                                                                                                      | 1280×720 Chromium: signup, initial draft, invalid-image retry, private upload, revision approval, daily availability, edit while live, private report triage, approved review, suspension, sign-out. Checks listing and actual image HTTP responses before and after publication. |

## Actual run — 19 November 2026

**Region-first catalog update:** the local preview was upgraded without a reset. All 385 cities/urban centres are assigned to the 12 regions. The desktop flow selects Tanger through its region, publishes the profile and finds it in the city’s carpentry directory. All 12 TAP tests and the five browser scenarios passed (the desktop case was rerun after correcting its label selector). Formatting, lint, strict TypeScript and the production build passed. The table below records the original pilot verification.

| Command / check                                                              | Outcome                                                                                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                     | Locked dependencies installed with Node 22.16.0 / npm 11.4.2                                                                                   |
| `npm run format:check`, `npm run lint`, `npm run typecheck`                  | Passed                                                                                                                                         |
| `npm test`                                                                   | 11 TAP tests passed, including the database suite and its eight subtests                                                                       |
| `npm run build`                                                              | Passed, Next.js 16.4.6 production build; public and protected application routes dynamically rendered                                          |
| `npm run seed:local`                                                         | Passed against local Auth, PostgreSQL and Storage, including the private original drawing                                                      |
| `npm run test:browser`                                                       | All five Playwright tests passed against the production web build and real services                                                            |
| `supabase db push --db-url … --yes` and `supabase migration list --db-url …` | Both migrations applied to a separate blank local PostgreSQL 17 database with prerequisite Auth/bucket objects; both migration versions listed |
| `supabase start` (CLI 2.75.0)                                                | Configuration read; blocked before container startup: no Docker daemon at `/var/run/docker.sock`                                               |

### Environment boundary

Node was bootstrapped outside the repository. For the end-to-end run, PostgreSQL 17.12, Supabase Auth v2.179.0, Supabase Storage v1.35.1 and PostgREST v13.0.7 ran as local processes from upstream distributions, with a loopback gateway, private file-backed storage and disposable database roles. The browser exercised actual email/password sessions, REST RPCs, image bytes and storage authorization; these calls were not mocked. During setup the private Storage service needed its normal `storage` search path and grants before its first upload succeeded.

The standard Docker-based **CLI start/reset orchestration**, including its gateway configuration, remains to be repeated on a Docker-enabled machine. Hosted deployment, external SMTP delivery/confirmation, external phone/WhatsApp delivery and physical-device or assistive-technology testing were not performed. Local auth used confirmed seed identities and local auto-confirm signup. Contact URL tests do not place calls or send messages.
