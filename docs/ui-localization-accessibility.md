# UI, language and accessibility

The default redirect is `/ar`; the document uses `lang="ary"` for Moroccan Arabic and `dir="rtl"`. `/fr` uses French LTR. The language link substitutes only the locale segment and retains the path and query, including selected filters or a review invitation. Structured labels are bilingual catalog data. Artisan names, services, reviews and feedback are user-entered text displayed as written.

The layout prioritizes trade and location, then a compact search form and shortcuts. Cards keep contact controls in the flow on small screens. Botanical green, clay, warm paper, house mark, tile motif, line icons and fixture drawing are original to the project. System fonts avoid a required font download. Responsive CSS uses logical properties. Phone numbers, times and ratings use LTR fields or bidirectional isolation where needed.

`src/app/style.css` includes a keyboard skip link, visible focus, labeled touch targets, wrapping controls and a narrow-screen layout. Forms use native labels, selects, checkboxes, fieldsets, legends, details and buttons. Pending mutation forms disable their controls; outcomes are announced with `role="status"`. Error boundaries offer a retry. Demo and verification status are written in text, not signaled by color alone.

Portfolio photos use meaningful localized alternative text with workshop and position. The original private WebP and small rendition are delivered through the same access check; the gateway disables caching. Galleries lazy-load; on small screens the `<picture>` source selects the smaller file. Cards use the small image or an original trade icon as fallback. No third-party analytics, external image hosts or widget scripts are required.

**Check:** run the mobile browser test at 360×800 and the desktop flow at the default 1280×720. Tab to the skip link, use the native trade/location controls, switch languages from filtered results, and check that mobile content fits the viewport. These are interaction smoke checks; they are not a screen-reader certification.
