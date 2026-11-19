# Auth and permissions

Accounts use email and password. The public Moroccan number is editorial data, never a login identifier. Supabase Auth provisions identities; a first valid save provisions a unique owner profile in the same transaction. Visitors browse, report and use a review invitation without signing up.

`src/lib/server.ts` creates a per-request cookie client with `@supabase/ssr`. `src/proxy.ts` calls `auth.getClaims()` for session cookies, forwards refreshed cookies to both request and response and applies cache headers. Protected pages/actions verify claims, then staff membership where required. The server never authorizes from an unverified `getSession()` payload. Signup configures a PKCE confirmation redirect; `/auth/callback` exchanges the code and sets session cookies. Use the browser that initiated signup for the PKCE verifier. Sign-out clears the session.

| Actor              | Read                                                                                  | Write                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Anonymous          | Active catalog, visible approved snapshot, approved reviews, attached approved images | Web report or token-scoped review via server and quota                                        |
| Signed-in owner    | Above plus own workspace, private library and feedback                                | Own revisions, own unused assets, current availability                                        |
| Staff              | Above plus private queue, reports, pending reviews and galleries                      | Catalog, independent moderation, phone confirmation, report triage, invite issuance           |
| Server service key | Private bucket                                                                        | Processed objects, registration for verified owner, quota and validated anonymous submissions |
| DB operator        | Private database                                                                      | Staff bootstrap/revocation, migrations and maintenance                                        |

Enable RLS on all application tables and keep `directory` out of the exposed schemas. There are no blanket client table policies. Public schema **functions** have individually reset EXECUTE grants and fixed search paths; the functions project fields and check roles/ownership before working with private tables. The Storage bucket has no client object policies. Anonymous clients cannot generate signed URLs to bypass later suspension. The web image gateway checks `can_read_asset` before fetching each object; private previews require the authenticated owner or staff.

### Operator-controlled staff

Create a normal, confirmed Auth user; verify the intended staff identity in the Auth dashboard. Using the privileged project SQL console, substitute the user UUID:

```sql
insert into directory.admins(uid) values ('00000000-0000-4000-8000-000000000000');
-- To revoke:
delete from directory.admins where uid='00000000-0000-4000-8000-000000000000';
```

Never derive staff from signup metadata, the email domain or a public role field. Membership is checked on each operation. Staff cannot approve their own listing. Revoking staff takes effect on the next operation. A changed, newly approved number loses the previous phone confirmation. Consent withdrawal hides the public version immediately; gallery and detail access follow it.

Phone sign-in is deferred: it needs a supported SMS provider configured in Supabase, Moroccan carrier delivery tests across providers, rate limiting, OTP expiry/recovery, sender and cost controls, and separate handling for changing an auth phone. A callback confirming a listing number is not identity verification. No ID documents are collected.

Verify the matrix with `npm test` and `npm run test:browser`. Relevant implementation: `src/features/accounts`, `src/features/moderation/actions.ts`, `src/features/profiles/actions.ts` and the migration grants.
