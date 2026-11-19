# Build «معلّم» — a Moroccan marketplace for home-service artisans

## Assignment

Implement the complete first release of «معلّم» in the current repository. Deliver a working web application, database migrations, local demo data, automated tests, and documentation for every implemented area. Start by inspecting the repository and its instructions. If it is empty, scaffold the project. Use an implementation plan to guide the work, then build and verify the application end to end.

«معلّم» helps someone who needs a home repair find an artisan who serves their area, see relevant work and availability, and call or open WhatsApp directly. Launch with plumbing, electrical work, and painting in one pilot city. Use Casablanca as a configurable demo city. Support additional cities, neighborhoods, and trades through the database and admin UI. One artisan can offer multiple trades under one profile.

## Product references

- [Khdemty home](https://khdemty.ma/) and [plumbing directory](https://khdemty.ma/plombier/) illustrate search by trade and area, trade directories, and WhatsApp contact. The public plumbing page shows region/province controls. For «معلّم», put city first, make neighborhood optional, and show contact actions in each result.
- [ACHNO home](https://achno.ma/) and [FAQ](https://achno.ma/faq.html) describe Darija-first requests, voice or text, photos, and offers with price and availability. ACHNO’s public website directs users to the app for contact. Let «معلّم» visitors search, compare profiles, and contact an artisan from the web without an account or installation. Visitors can share photos and voice notes once they open WhatsApp.
- Use these as product references. Create original branding, copy, layout, and assets. Use synthetic demo profiles and licensed or original visuals unrelated to real competitor listings. Public pages must never imply seed profiles are real or publish demo contacts in production.

## Architecture

- Use Next.js App Router with strict TypeScript and one web deployment. Organize code by feature with clear boundaries for discovery, profiles, accounts, catalog, and moderation. Use Supabase Postgres, Auth, and Storage in one project per environment. Keep the model and business rules usable by both the web app and a future Expo app. Document the data access paths a future mobile client can use.
- Use server-rendered public pages, with client JavaScript for interactions that need it. Use the official Next.js and Supabase server-auth guidance for the versions you install. Use SQL migrations as the source of truth and commit the lockfile, generated database types or the command to generate them, and a secret-free `.env.example`.
- Separate public listing fields from private account information and moderation data. Enable RLS and explicit grants for exposed database objects. Check role and ownership on protected server operations as well. Keep privileged credentials server-side and grant admin by an operator-controlled process. Document that process. Authenticated users must never be able to grant themselves admin, set verification, or publish their own profile.

## What to build

### Public search and discovery

- Make the first screen answer **«شنو خاصك؟»** and **«فين؟»**. Offer quick trade shortcuts, a city picker, and optional neighborhood search. Keep location permission optional by supporting full manual selection. Recognize common trade names and symptom aliases in Arabic Darija, French, and common Latin spellings. Seed examples such as «بلومبي», «الماء كيسرب», “plombier”, and «تريسيان». Normalize common accents and Arabic spelling variants. Store manageable aliases in the catalog.
- Give results a shareable URL with locale, trade, city, and optionally neighborhood and availability. Keep filters when returning from a profile. Show only published artisans whose service areas cover the selection. Distinguish citywide coverage from specific neighborhoods. Rank relevant area matches and current availability consistently, with stable pagination. If a specific neighborhood has no matches, explain that and let the visitor explicitly expand to the city. Provide meaningful empty, error, retry, and loading states.
- On each result show the artisan’s name, photo or fallback, trade, coverage, review count when available, and any disclosed visit fee in MAD. Distinguish free, fixed fee, and unspecified. Show **«متاح اليوم»** only when explicitly confirmed for the current date in `Africa/Casablanca`, with the update time. Expire the badge automatically at the next local date, including when a visitor returns to a previously cached page. Keep «عيّط» and «واتساب» visible on mobile.
- Build shareable artisan profiles with services, coverage, portfolio, public contact details the artisan agreed to publish, and moderated reviews. Use `tel:` and a correctly encoded WhatsApp link with a localized message containing the selected trade and area. Validate and normalize phone numbers. Omit the WhatsApp button when that channel is disabled and preserve phone calling. Opening a contact link does not mean an appointment or a completed job. Provide a way to report a broken contact or problematic profile.

### Artisan accounts and workspace

- Implement Supabase Auth sign-in and sign-out, account provisioning, and session handling. Use email as the supported first-release sign-in method. Keep the public Moroccan contact number distinct from the private sign-in identifier. Document what an SMS provider and tested Moroccan-number delivery would require if phone sign-in is added. Enable anonymous browsing without creating visitor accounts.
- Let an artisan create and edit one profile, select multiple active trades, choose covered areas, set a visit fee, consent to showing their contact number, upload and order portfolio photos, and update availability from a mobile-friendly dashboard. Validate inputs and enforce upload limits, accepted image types, and ownership. Only approved assets attached to published listings should be publicly reachable. Handle upload failures and retries without losing existing media.
- Support draft, pending, published, and suspended states, plus actionable feedback when changes are needed. Require admin review before new public content is published. Specify and test what a visitor sees during review of edits to a published profile. Allow availability updates on a published profile without re-review. Remove or reverify the phone badge when its number changes, and keep verification write access exclusive to admins. Define badge wording to reflect what was actually checked. Launch with a phone confirmation workflow. Collect government ID only if a future separately specified verification flow requires it.

### Administration, reports, and reviews

- Build a protected admin dashboard to manage trades and aliases, cities and neighborhoods, approve/request changes/suspend listings, record how and when a phone number was confirmed, and triage reports. Catalog changes must preserve existing references. Store minimal moderation history with an actor and timestamp. Validate forms on the server and protect public submissions against repeated abuse. Keep reports private.
- WhatsApp calls and messages happen outside the application. Start with an admin-assisted review workflow. Once staff have documented confirmation of a completed job, they can issue a scoped, expiring, single-use review link. The recipient can submit a rating and short comment without an account. Store only a hash of the review token, consume it atomically when accepting a review, and keep the review pending until moderation. Expose only approved reviews and derive public counts/averages from them. Label new profiles without reviews honestly. Document exactly what the workflow confirms and how staff issue and share the link.

### Design, languages, and search visibility

- Design an original mobile-first interface for people who may be using a small phone or a slow connection. Use Arabic-script Darija as the default with right-to-left layout, and offer French with left-to-right layout. Preserve the current destination and search filters when switching languages. Localize navigation, validation messages, states, and contact text. Treat numbers and phone links correctly in RTL text.
- Keep cards easy to scan. Use high-contrast text, large labeled touch targets, visible focus, accessible form labels, keyboard navigation, and meaningful image alternatives. Optimize responsive photos and lazy-load galleries below the first screen. Use visuals with a clear purpose and avoid filler copy, invented metrics, and unsupported promises about response times or verification.
- Give published listings and supported city/trade landing pages useful metadata and stable localized URLs. Add canonical and language alternates where appropriate, a public sitemap, and robots directives. Keep admin, account, private, preview, and demo content out of the public index. Use indexable city/trade landing pages for real coverage, with a human-readable empty state elsewhere.

### Release boundary

This release covers artisan discovery, direct contact, the artisan workspace, moderation, and reviews. Put in-app chat, voice intake or AI matching, quote bidding, booking, payments, native apps, and additional city rollout in `docs/roadmap.md`. Treat these as future features and omit dummy controls for them from the live interface.

## Data, setup, and tests

- Model catalog entities, service areas, profile-to-trade relationships, public listing data, private account and moderation data, availability, media, reports, review invitations, and reviews. Add foreign keys, uniqueness rules, checks, and indexes for the actual query paths. Make multi-row changes atomic where required. Test data visibility both through UI/server flows and at the Supabase permission boundary.
- Make local setup reproducible with Supabase CLI migrations, deterministic local seed data, and sample artisan/admin access through a documented local-only setup. Include at least one usable result for each pilot trade, an artisan with multiple trades, citywide and neighborhood coverage, a new profile without reviews, and expired availability. Guard the seed setup from production use. Ensure demo contact actions cannot call or message real numbers.
- Add scripts and run formatting checks where configured, lint, type checking, a production build, and tests. Use database policy tests and browser smoke tests. Cover anonymous search and localized filters, empty-result recovery, return navigation, mobile RTL/French LTR and keyboard use, contact link generation, artisan edit/upload and moderation, stale availability across a Moroccan day boundary, owner/admin separation, unpublished profile/media access, and review-link expiry and reuse. Verify that a published profile appears in results and disappears when suspended. Exercise the app in a browser on mobile and desktop sizes. Record commands and outcomes. If configuration outside the workspace prevents a check, record the dependency and the unverified behavior precisely and keep working on the remaining checks.

## Documentation deliverables

Update documentation alongside implementation. Write technical docs in clear English and include short Arabic-script Darija walkthroughs for artisan and admin tasks. Use paths and commands that match the finished repository. Explain each feature’s behavior, source locations, data and permissions when relevant, verification steps, and operational edge cases.

| File | Required content |
| --- | --- |
| `README.md` | Prerequisites, local setup, environment variables, database setup and seeding, demo roles, supported commands, and links to the documentation. |
| `docs/architecture.md` | Feature boundaries, web and data flow, server/client responsibilities, architectural decisions, and the future mobile integration surface. |
| `docs/database.md` | Schema diagram, relationships, state transitions, query indexes, migrations, generated types, and seed strategy. |
| `docs/auth-and-permissions.md` | Auth flow, role matrix, RLS and grants, admin bootstrap, public/private fields, contact consent, and verification rules. |
| `docs/features/discovery.md` | Search aliases, location hierarchy, filtering and ranking, fallback states, availability expiry, profile sharing, and contact actions. |
| `docs/features/artisan-workspace.md` | Onboarding, editing and approval, galleries, contact details, visit fees, and availability. |
| `docs/features/admin-and-reviews.md` | Catalog maintenance, moderation, reports, phone confirmation, review evidence, issuing and consuming review links, and publication rules. |
| `docs/ui-localization-accessibility.md` | Design decisions, Arabic-script Darija and French, RTL/LTR, accessibility checks, and image handling. |
| `docs/deploy-and-operate.md` | Deployment and environment configuration, Auth redirects, migrations, production catalog setup, storage, SEO, smoke checks, rollback and routine maintenance. |
| `docs/testing.md` | Test fixtures, commands, coverage mapped to the main flows, actual results, and checks still pending. |
| `docs/roadmap.md` | Deferred features and what needs to be true before introducing them. |

## Definition of done

From a fresh checkout, a developer can start the app and local database from the documented commands. A visitor can find and contact an eligible artisan without signing in. An artisan can sign in, submit a profile, and update availability. An admin can approve it, handle a report, and issue a review link whose approved result appears publicly. Screen responsiveness, bilingual behavior, access boundaries, and migrations are verified. The final handoff lists what shipped, where to find each doc, which checks ran, and any exact setup dependency still outstanding. Complete the repository work locally. Production deployment and production account setup require their own authorization.
