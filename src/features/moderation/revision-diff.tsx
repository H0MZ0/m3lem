import { nameOf, tr, type Item, type Locale, type Revision } from "@/lib/model";
import { Photo } from "@/features/profiles/photo";
export function RevisionDiff({
  previous,
  next,
  l,
  items,
}: {
  previous: Revision;
  next: Revision;
  l: Locale;
  items: Item[];
}) {
  const t = (a: string, b: string) => tr(l, a, b);
  const labels = {
    name: t("الاسم", "Nom"),
    services: t("الخدمات", "Services"),
    phone: t("الرقم", "Téléphone"),
    city: t("المدينة", "Ville"),
    trades: t("الحرف", "Métiers"),
    consent: t("نشر الرقم", "Publication du numéro"),
    whatsapp: "WhatsApp",
    fee: t("ثمن التنقل", "Déplacement"),
    gallery: t("الصور بالترتيب", "Photos dans l’ordre"),
  };
  function value(r: Revision, k: keyof typeof labels) {
    if (k === "gallery")
      return r.gallery.length ? (
        <div className="gallery">
          {r.gallery.map((id, i) => (
            <Photo key={id} id={id} l={l} n={i + 1} name={r.name} />
          ))}
        </div>
      ) : (
        "—"
      );
    if (k === "trades")
      return r.trades.map((s) => nameOf(items, s, l)).join(" · ");
    if (k === "city") return nameOf(items, r.city, l);
    if (k === "consent" || k === "whatsapp")
      return r[k] ? t("نعم", "Oui") : t("لا", "Non");
    if (k === "fee")
      return r.fee === null ? t("ما تحددش", "Non précisé") : `${r.fee} MAD`;
    return <bdi>{r[k]}</bdi>;
  }
  const changes = (Object.keys(labels) as (keyof typeof labels)[]).filter(
    (k) => JSON.stringify(previous[k]) !== JSON.stringify(next[k]),
  );
  return (
    <section className="revision-diff">
      <h3>{t("شنو تبدّل؟", "Modifications proposées")}</h3>
      {changes.length ? (
        changes.map((k) => (
          <section key={k}>
            <h4>{labels[k]}</h4>
            <dl>
              <dt>{t("منشور", "Publié")}</dt>
              <dd>{value(previous, k)}</dd>
              <dt>{t("مقترح", "Proposé")}</dt>
              <dd>{value(next, k)}</dd>
            </dl>
          </section>
        ))
      ) : (
        <p>
          {t("ما كاين حتى تغيير فالمحتوى.", "Aucune différence de contenu.")}
        </p>
      )}
    </section>
  );
}
