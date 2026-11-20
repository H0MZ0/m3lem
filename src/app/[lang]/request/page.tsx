import { catalog, locale } from "@/lib/server";
import { scalar, tr } from "@/lib/model";
import { seo } from "@/lib/seo";
import { ActionForm } from "@/features/accounts/form";
import { Location } from "@/features/discovery/controls";
import { submit } from "@/features/requests/actions";
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/request">) {
  const l = locale((await params).lang);
  return seo(
    l,
    "/request",
    tr(l, "صيفط طلب خدمة", "Envoyer une demande de service"),
    tr(
      l,
      "وصف المشكل، زيد تصاور، وخلي الحرفيين المطابقين يتواصلو معاك بلا حساب.",
      "Décrivez le problème, ajoutez des photos et laissez les artisans correspondants vous contacter sans compte.",
    ),
  );
}
export default async function RequestPage({
  params,
  searchParams,
}: PageProps<"/[lang]/request">) {
  const l = locale((await params).lang),
    q = await searchParams,
    items = await catalog(),
    trades = items
      .filter((i) => i.kind === "trade" && i.active)
      .sort((a, b) => a[l].localeCompare(b[l], l)),
    city = items.find(
      (i) => i.kind === "city" && i.slug === scalar(q.city) && i.active,
    ),
    trade = items.find(
      (i) => i.kind === "trade" && i.slug === scalar(q.trade) && i.active,
    );
  return (
    <section className="narrow">
      <h1>{tr(l, "صيفط طلب خدمة", "Envoyer une demande de service")}</h1>
      <p>
        {tr(
          l,
          "وصف المشكل بالدارجة، زيد حتى 3 تصاور، وخلي الحرفيين اللي كيخدمو فالمدينة والحرفة اللي اختريتي يتواصلو معاك. ما خاصكش حساب.",
          "Décrivez le problème, ajoutez jusqu’à 3 photos et laissez les artisans de la ville et du métier choisis vous contacter. Aucun compte requis.",
        )}
      </p>
      <ActionForm
        keepValues
        action={submit.bind(null, l)}
        className="panel stack"
      >
        <div className="hp" aria-hidden="true">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label>
          {tr(l, "شنو خاصك؟", "De quoi avez-vous besoin ?")}
          <select name="trade" required defaultValue={trade?.slug ?? ""}>
            <option value="" disabled>
              {tr(l, "اختار الحرفة", "Choisissez le métier")}
            </option>
            {trades.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i[l]}
              </option>
            ))}
          </select>
        </label>
        <Location
          l={l}
          items={items}
          initial={city?.slug ?? ""}
          initialRegion={city?.parent ?? ""}
        />
        <label>
          {tr(l, "شرح المشكل", "Décrivez le problème")}
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            placeholder={tr(
              l,
              "مثلاً: الماء كيسرب تحت الحوض فالطبلة، وخاصني شي واحد يجي اليوم.",
              "Ex. : fuite sous l’évier de la cuisine, besoin de quelqu’un aujourd’hui.",
            )}
          />
        </label>
        <label>
          {tr(l, "سميتك", "Votre nom")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </label>
        <label>
          {tr(l, "نمرة التليفون", "Téléphone")}
          <input
            type="tel"
            dir="ltr"
            name="phone"
            required
            autoComplete="tel"
            placeholder="06… / +212…"
          />
        </label>
        <label>
          {tr(
            l,
            "تصاور (اختياري) · حتى 3، المجموع تحت 5 MiB",
            "Photos (facultatif) · 3 maximum, 5 Mio au total",
          )}
          <input
            type="file"
            name="photos"
            multiple
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
        <label className="check">
          <input type="checkbox" name="consent" required />
          {tr(
            l,
            "موافق نشاركو نمرتك مع الحرفيين المطابقين باش يتواصلو معاك.",
            "J’accepte que mon numéro soit partagé avec les artisans correspondants pour me contacter.",
          )}
        </label>
        <button>{tr(l, "صيفط الطلب", "Envoyer la demande")}</button>
      </ActionForm>
      <aside className="panel">
        <h2>{tr(l, "كيفاش كيخدم؟", "Comment ça marche ?")}</h2>
        <ol>
          <li>
            {tr(
              l,
              "الطلب كيبان للحرفيين المنشورين فهاد المدينة والصنعة.",
              "La demande apparaît aux artisans publiés de cette ville et de ce métier.",
            )}
          </li>
          <li>
            {tr(
              l,
              "الحرفي كيعيّط ولا كيصيفط واتساب، وكيسجل بلي تواصل.",
              "L’artisan appelle ou envoie un WhatsApp, puis enregistre son contact.",
            )}
          </li>
          <li>
            {tr(
              l,
              "تقدر تسد الطلب من الرابط الخاص اللي غادي يبان ليك من بعد الإرسال.",
              "Vous pouvez clôturer la demande depuis le lien privé affiché après l’envoi.",
            )}
          </li>
        </ol>
        <small>
          {tr(
            l,
            "معلّم ما كيضمنش الثمن ولا الجودة. الطلب ماشي حجز، والخلاص كيتفق عليه مباشرة مع الحرفي.",
            "M3lem ne garantit ni le prix ni la qualité. Une demande n’est pas une réservation ; le paiement se convient directement avec l’artisan.",
          )}
        </small>
      </aside>
    </section>
  );
}
