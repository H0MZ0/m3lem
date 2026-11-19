# Discovery

Start at `/ar` or `/fr`. Select a region and then a city in that region, and type a trade or symptom. Selecting a different region clears the city and updates its options. On results pages both controls reflect the current city. No geolocation prompt or installation is needed.

`/[lang]/search` checks the region/city pair and redirects to `/[lang]/city/[city]/[trade]` (`all` for all trades). The city slug determines its region; `today=1` and `page` are optional query parameters. Old neighborhood links redirect to the city directory. Unknown text produces an explicit unknown-trade state. Matching uses normalized labels, slugs and staff-managed aliases, including `بلومبي`, `الماء كيسرب`, `plombier` and `تريسيان`.

`find_artisans` selects only visible, consenting, approved revisions in the chosen city. Current availability comes first, then immutable profile ID. The API returns up to 13 rows for a 12-row page; the extra row indicates a next page.

If no artisan matches, the search form stays available. Each card opens `/[lang]/p/[id]` with the selection attached; the return link reconstructs the result page. Canonical profile URLs omit those filters.

Only a same-day owner confirmation yields the availability badge. Postgres compares local **calendar dates** in `Africa/Casablanca` and calculates the next local midnight using its timezone rules. The client displays the confirmation time and removes the badge at expiry, rechecking on `pageshow` and visibility changes and refreshing the results. An expired confirmation is not a negative availability claim.

Cards distinguish free, fixed and unspecified visit fees. Counts/averages include approved reviews only. A profile shows services, coverage, portfolio in approved order, contact number, optional phone-confirmation badge and approved comments. `contacts()` accepts a validated Moroccan number, emits `tel:+212…` and optionally `https://wa.me/212…?text=…`, encoding a localized message with trade and location. Without WhatsApp, calling remains. No click records a job. Visitors can send photos or voice after opening WhatsApp. Reports go privately to staff.

**Verify:** select Casablanca-Settat → Casablanca, try `الماء كيسرب` with the today filter, switch to French, open the result and return. Switch to Tanger-Tétouan-Al Hoceima: the city should reset and Casablanca should no longer be an option. The local sample contact buttons are deliberately inert.
