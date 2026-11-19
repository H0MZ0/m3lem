import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { locale, rpc } from "@/lib/server";
import { tr } from "@/lib/model";
import { review } from "@/features/moderation/actions";
import { ActionForm } from "@/features/accounts/form";
export default async function Page({
  params,
}: PageProps<"/[lang]/review/[token]">) {
  const { lang, token } = await params,
    l = locale(lang);
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const name = await rpc<string | null>(
    "review_subject",
    { token_hash: createHash("sha256").update(token).digest("hex") },
    true,
  );
  if (!name)
    return (
      <section className="narrow panel">
        <h1>{tr(l, "الرابط ما بقاش متاح", "Lien indisponible")}</h1>
        <p>
          {tr(
            l,
            "الرابط سالا، تستعمل، ولا ما بقاش متاح.",
            "Lien expiré, déjà utilisé ou indisponible.",
          )}
        </p>
      </section>
    );
  return (
    <section className="narrow">
      <h1>
        {tr(
          l,
          `كيف دازت الخدمة مع ${name}؟`,
          `Comment s’est passée l’intervention de ${name} ?`,
        )}
      </h1>
      <p>
        {tr(
          l,
          "الرابط شخصي وكيتستعمل مرة وحدة. الرأي كيدوز من المراجعة قبل النشر.",
          "Ce lien personnel est à usage unique. Votre avis sera relu avant publication.",
        )}
      </p>
      <ActionForm action={review.bind(null, l, token)} className="panel stack">
        <label>
          {tr(l, "النقطة من 5", "Note sur 5")}
          <select name="rating" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          {tr(l, "الرأي ديالك", "Votre avis")}
          <textarea minLength={3} maxLength={500} required name="comment" />
        </label>
        <button>{tr(l, "صيفط الرأي", "Envoyer l’avis")}</button>
      </ActionForm>
    </section>
  );
}
