import { notFound } from "next/navigation";
import { locale } from "@/lib/server";
import { tr } from "@/lib/model";
import { review } from "@/features/moderation/actions";
import { ActionForm } from "@/features/accounts/form";
export default async function Page({
  params,
}: PageProps<"/[lang]/review/[token]">) {
  const { lang, token } = await params,
    l = locale(lang);
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  return (
    <section className="narrow">
      <h1>
        {tr(l, "كيف دازت الخدمة؟", "Comment s’est passée l’intervention ?")}
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
