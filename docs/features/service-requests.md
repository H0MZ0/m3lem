# Service requests

A visitor can describe a job at `/[lang]/request` without signing up. The form
asks for an active trade, a region and a city from the same region, a
10–1 000 character description, a name and a valid Moroccan phone. Consent to
share that phone with matching artisans is explicit and required. Up to three
JPEG/PNG/WebP photos can be attached, 5 MiB in total. Sharp decodes, reorients,
strips metadata and writes WebP; the objects go to the private `request-media`
bucket. A hidden field and the shared hourly quota discourage automated posts.

The database stores only a SHA-256 hash of a 256-bit bearer token. The raw
token appears once in the redirect to `/[lang]/request/[token]`, the private
status page. It shows the reference, trade, city, description, photos, expiry
and the number of artisans who registered a contact. It never shows which
artisan responded or the customer's phone to anyone without the token. The
customer can close the request from that page. Requests expire after 14 days.

`my_requests()` exposes only open, unexpired requests whose city and trade
match the signed-in artisan's **published** revision. The workspace **Demandes**
tab lists them with photos, customer name and phone, plus call and WhatsApp
links carrying a localized prefilled message. **J’ai contacté** records a
response atomically; it does not claim the job for one artisan or guarantee
the customer replied. Staff see all open requests in `/admin`, including
responders, and can close or remove one. Removing deletes its private photos.

The private photo gateway `/request-media/[id]` calls
`can_read_request_photo`: staff, a matching published artisan, or the token
holder may read. There are no Storage client policies. No email or push
notification is sent: artisans discover new work when they open the workspace.
A request is not a booking, quote, payment, identity check or job completion
record. Chat, voice intake and bidding remain deferred in the [roadmap](../roadmap.md).

**Byan bil-darija:** l-zboun ma khassoch account. Kteb chno khassou, khtar
l-medina w l-san3a, w zid sswar. L-7rfiiyin li mnéchourin f l-medina w f
l-san3a ghir hom li kaychou l-talab, w kaykemmlo b l-tilifoun wla WhatsApp.
L-link d l-7ala khass b l-zboun wahdo. Ma kaynch hja, khlas wla tawthiq f had
l-mar7la.

**Verify:** `tests/database.test.ts` covers token projection, catalog/consent
validation, matching, contact recording, expiry and staff triage.
`tests/browser/requests.spec.ts` sends a real photo request, handles it from
the artisan inbox and closes it in the admin queue.
