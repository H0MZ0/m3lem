# Artisan workspace

Open `/fr/workspace` or `/ar/workspace`. Sign in or create an email/password account. Fill in a public name, services and at least one active trade. Choose the region, then the city where you work. The displayed phone number is separate from the private login email. Moroccan national or international formatting is normalized to `+212…`. Set the visit fee to zero for free, a whole number for a fixed price, or leave it blank. Enable WhatsApp separately from consent to publish the phone number.

Save a draft to create the profile and unlock uploads. Submit for review when ready. The workspace displays the latest decision and feedback. Approval publishes the exact reviewed revision. Editing a published profile keeps the old approved version publicly visible, **including the old contact and gallery**, until the new version passes review. Withdrawing consent and saving a draft removes the live version immediately. A suspended profile cannot be edited until staff return it for corrections. Refresh after a stale-save conflict.

On a live profile, confirm availability for today or remove it. This operation does not create a new revision or require a moderator. Yesterday's confirmation cannot advertise today. The last confirmation timestamp in the workspace is informational.

### Gallery

The workspace has three destinations: **Aujourd’hui** (publication state, availability, link to the public fiche), **Ma fiche** (services and contact details) and **Mes photos** (import, order and submit photos). New accounts open on the profile form. A failed profile save preserves the entered values and identifies invalid phone/fee/contact fields. Both profile and photo edits use the same optimistic revision check. Saving one preserves the other’s last saved content; switching sections is navigation, not autosave.

Upload one JPEG, PNG or WebP at a time, at most 5 MiB and 24 megapixels, static images only. The server checks both declared type and decoded format. Sharp applies orientation, strips metadata and writes WebP renditions bounded to 1280 and 480 pixels. The bucket is private. Max 24 library assets and eight selected photos per revision. Choose photos, give them distinct ranks from 1 to 8 and save or submit. Approval covers the selected images in their reviewed order.

A failed upload leaves existing media and the approved version intact. Retry with a smaller valid file. Deselect a photo and obtain approval to remove it from a live gallery; use **Supprimer des photos inutilisées** for assets no longer referenced by any revision. The DB checks ownership and references even for a direct request. A key is generated per upload rather than replacing old bytes.

**بالدارجة:** دخل بالإيميل، كتب الاسم والخدمات، واختار الحرف. اختار الجهة ومن بعدها المدينة اللي كتخدم فيها. حفظ المسودة، حمّل التصاور ورتّبهم، ومن بعد صيفط للمراجعة. إلا رجعات ملاحظة صلّحها وصيفط من جديد. منين يتنشر البروفايل، أكد «متاح اليوم» غير فالنهار اللي نتا متاح فيه.

**Verify:** `npm run test:browser` exercises signup, draft creation, failed and successful uploads, hidden previews, approval, an edit during publication, availability and suspension. `npm test` covers stale revisions and phone re-verification. Sources: `src/app/[lang]/workspace`, `src/features/profiles`, `src/app/media/[id]/route.ts`.
