# Architecture

One Next.js App Router deployment owns the HTML, forms, media gateway and email callback. Supabase supplies Auth, Postgres/PostgREST and a private Storage bucket. There is no visitor identity, job or booking created by a search or contact click.

| Boundary     | Sources                                                                    | Responsibility                                                                 |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Discovery    | `src/features/discovery`, `src/app/[lang]/city`, `search`, `p`             | GET search, stable directories, cards, profiles, filter preservation, expiry   |
| Accounts     | `src/features/accounts`, `src/proxy.ts`, `src/app/auth/callback`           | Email auth, cookie refresh, action feedback and session termination            |
| Profiles     | `src/features/profiles`, `src/app/[lang]/workspace`, `src/app/media`       | Owner revision, image pipeline, library and daily availability                 |
| Requests     | `src/features/requests`, `src/app/[lang]/request`, `src/app/request-media` | Anonymous intake, private photos, token status, artisan inbox and staff triage |
| Catalog      | `src/features/catalog`, `catalog_items` / `manage_catalog` RPCs            | Stable taxonomy and aliases                                                    |
| Moderation   | `src/features/moderation`, `src/app/[lang]/admin`, `review`                | Staff decisions, evidence, anonymous submissions                               |
| Shared rules | `src/lib/model.ts`, `supabase/migrations`                                  | Locale-aware formatting, normalized contacts and transactional invariants      |

Request → locale route → per-request Supabase SSR client → explicitly granted RPC → projection over private tables. Server Components produce the initial directory, profile and dashboard HTML. Client islands handle dependent selects, language switching, action pending/feedback and availability timers. Forms changing state use same-origin Next Server Actions. Access checks run inside each protected action; the DB independently checks `auth.uid()` against ownership or the operator-managed staff list.

Two pointers, `live` and `working`, avoid copying a half-edited profile into public results. The whole change set is committed together. Row locks serialize owner and moderator decisions; the base revision prevents a stale tab from overwriting a newer save. Object storage and Postgres cannot share a transaction: write new private objects first, register them after success, compensate on failure. Old images remain intact.

## Future mobile client

Use the same Supabase project’s public key and the native SDK's authenticated session. Read `catalog_items`, then `find_artisans` with slugs, or `artisan_detail` with a public profile UUID. Their JSON contracts are in `src/lib/model.ts`. Omit `show_demo`. Public image paths are `SITE_URL/media/{asset-id}` (`?size=small` for previews). A phone link and WhatsApp URL are pure functions of the public projection and selected area. No private account identifier need enter the UI.

An owner JWT can call `my_workspace`, `save_profile` and `set_available`; the database ignores client-supplied roles and obtains the owner from the JWT. Use the current `revision.id` as `body.base` when saving. `my_workspace` returns `null` until the first valid save. Reauthenticate and reload on conflict. Reuse the image-validation and abuse-budget server paths via a separately authenticated HTTP adapter before shipping native uploads, private media previews or anonymous reports. Next Server Actions are web internals, not a stable mobile API. Never ship a service credential.
