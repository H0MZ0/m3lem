# Staff operations

Enter `/fr/admin` or `/ar/admin` using an operator-granted staff account. Authorization is checked on page load, on every staff Server Action and inside the DB routines. See [permissions](../auth-and-permissions.md) for bootstrap.

### Catalog

Expand **Nouvelle entrée**. Enter a globally unique, stable ASCII slug, bilingual labels and kind. Create the city before creating its neighborhoods; set a parent only for a neighborhood. Add comma-separated aliases on a trade. Edit labels, aliases and active status on an existing row. Kind, parent and slug are immutable. Inactive rows retain their foreign keys but are no longer selectable; an inactive city also hides its neighborhoods. Archiving the last active trade or all explicit service areas hides the listing rather than silently treating it as citywide.

### Listings, confirmation and reports

Open a pending fiche and inspect its contact consent, services, coverage, fee and **every selected photo**. Approve to replace the live snapshot, or enter an actionable reason and request corrections. Suspend for a serious problem, recording the reason; this immediately hides the listing and prevents public image access. Return a suspended profile for corrections before a new review. A revision ID travels with each decision; a stale review must reload.

To confirm a number, call the number on the **currently published revision**, establish that the artisan answers and agrees it is their business contact, and record the method/outcome (for example, “staff callback answered; public contact confirmed”). Choose **Confirmer le numéro**. The actor, timestamp and note are recorded; the badge says only “Numéro confirmé par l’équipe”. It certifies neither identity nor trade qualifications. No government ID upload exists. A different approved number requires a new confirmation.

Visitors can submit a private reason on the profile. Staff see the associated listing and reason; investigate, correct/suspend if needed, then close the signalement. “Close” is a triage decision, not proof a complaint was false. Staff actions write actor, subject and timestamp to `directory.history`.

### Review invitation

1. **Confirm a completed intervention off-platform** with the customer; resolve ambiguous evidence before issuing. Contact clicks, WhatsApp launches and availability are not completion evidence.
2. On the published artisan’s panel, enter a minimal confirmation note: method, job reference/date and confirmation outcome. Avoid phone numbers, ID images or copied chat transcripts.
3. Select **Émettre un lien d’avis**. Copy the resulting URL and share it privately with that customer. The raw 256-bit token is shown to the issuer once; only its SHA-256 digest is stored. Each invitation is bound to that profile and evidence, with a seven-day expiry. A lost URL cannot be retrieved from the database.
4. The recipient opens `/[lang]/review/[token]`, selects 1–5 and writes a short comment (3–500 characters). No account is required. An atomic update requires unused, unexpired, still-visible scope. Review insertion and token consumption commit together; invalid input does not burn the link.
5. Staff read the pending review, then publish or reject. Only approved rows contribute to public reviews, count and average. Job confirmation is staff-assisted, not a guarantee of workmanship or independent identity verification.

Rate limiting runs before anonymous writes: five reports or twenty review attempts per hourly client bucket, shared across instances in Postgres. Keys are HMACs of scope and a trusted ingress identifier; raw IPs are not stored. By default the budget is shared, including on localhost. Set a trusted, overwritten header behind a controlled ingress for deployment. Direct public clients have no execute grant on the write or quota functions. Invalid review URLs never reveal which validation condition failed.

**بالدارجة:** دخل للإدارة، حلّ البروفايل وراجع الخدمة والتصاور والرقم. وافق ولا كتب شنو خاصّو يتصلّح. باش تأكد النمرة عيّط وسجّل كيفاش تأكدتي. إلا الزبون أكد أن الخدمة سالات، كتب دليل مختصر، خرج الرابط وصيفطو ليه بوحدو. الرأي ما كيبان حتى تراجعو وتنشرو.

**Verify:** `src/features/moderation/actions.ts`, `src/features/catalog/editor.tsx`, `src/app/[lang]/admin`, `src/app/[lang]/review` and the SQL RPCs implement this workflow. The browser test issues and uses a real link, rejects reuse, moderates the review and closes a report.
