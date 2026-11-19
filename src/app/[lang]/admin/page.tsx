import { access, locale, rpc, catalog } from "@/lib/server";
import { nameOf, tr, stateName, type Queue } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { CatalogManager } from "@/features/catalog/pickers";
import { Photo } from "@/features/profiles/photo";
import { moderate, issue, triage } from "@/features/moderation/actions";
export default async function Admin({ params }: PageProps<"/[lang]/admin">) {
  const l = locale((await params).lang);
  await access(l, true);
  const [q, items] = await Promise.all([
      rpc<Queue>("staff_queue"),
      catalog(true),
    ]),
    t = (a: string, b: string) => tr(l, a, b);
  return (
    <section className="narrow">
      <h1>{t("الإدارة", "Administration")}</h1>
      <h2>{t("البروفايلات", "Fiches artisan")}</h2>
      {q.profiles.map((p) => {
        const r = p.revision;
        return (
          <details className="panel" key={p.id}>
            <summary>
              {r.name} · {stateName(p.state, l)}
            </summary>
            <p>{r.services}</p>
            <p>
              {[...r.trades, r.city, ...r.areas]
                .map((s) => nameOf(items, s, l))
                .join(" · ")}{" "}
              · {r.fee ?? "—"} MAD
            </p>
            <p>
              <bdi>{r.phone}</bdi> ·{" "}
              {r.consent
                ? t("الموافقة على النشر", "Consentement reçu")
                : t("ما موافقش على النشر", "Sans consentement")}{" "}
              · WhatsApp {r.whatsapp ? "✓" : "—"}
            </p>
            {p.verified_at && (
              <p>
                {t("تأكيد النمرة", "Confirmation du numéro")} :{" "}
                <bdi>{p.verified_at}</bdi>
              </p>
            )}
            {p.feedback && <p>{p.feedback}</p>}
            <div className="gallery">
              {r.gallery.map((id, i) => (
                <Photo key={id} {...{ id, l, n: i + 1, name: r.name }} />
              ))}
            </div>
            <ActionForm
              action={moderate.bind(null, l, p.id, r.id)}
              className="stack"
            >
              <label>
                {t(
                  "سبب القرار أو كيفاش تأكدات النمرة",
                  "Motif ou méthode de confirmation du numéro",
                )}
                <textarea name="note" maxLength={500} />
              </label>
              <div className="buttons">
                {p.state === "pending" && (
                  <button name="decision" value="approve">
                    {t("وافق ونشر", "Approuver et publier")}
                  </button>
                )}
                {(p.state === "pending" || p.state === "suspended") && (
                  <button name="decision" value="changes">
                    {t("طلب التصحيح", "Demander des corrections")}
                  </button>
                )}
                {p.live === r.id && (
                  <button name="decision" value="confirm">
                    {t("أكد النمرة", "Confirmer le numéro")}
                  </button>
                )}
                {p.state !== "suspended" && (
                  <button className="danger" name="decision" value="suspend">
                    {t("وقف البروفايل", "Suspendre")}
                  </button>
                )}
              </div>
            </ActionForm>
            {p.live && (
              <ActionForm action={issue.bind(null, l, p.id)} className="stack">
                <label>
                  {t(
                    "كيفاش تأكدتي أن الخدمة تسالات؟",
                    "Preuve documentée de fin d’intervention",
                  )}
                  <textarea
                    name="evidence"
                    minLength={8}
                    maxLength={500}
                    required
                  />
                </label>
                <button>{t("خرج رابط الرأي", "Émettre un lien d’avis")}</button>
              </ActionForm>
            )}
          </details>
        );
      })}
      <h2>{t("التبليغات", "Signalements")}</h2>
      {!q.reports.length && (
        <p>{t("ما كاين حتى تبليغ جديد.", "Aucun signalement ouvert.")}</p>
      )}
      {q.reports.map((r) => (
        <ActionForm
          key={r.id}
          action={triage.bind(null, l, r.id)}
          className="panel"
        >
          <strong>
            {q.profiles.find((p) => p.id === r.profile)?.revision.name}
          </strong>
          <p>{r.reason}</p>
          <button name="decision" value="close">
            {t("سدّ التبليغ", "Clore le signalement")}
          </button>
        </ActionForm>
      ))}
      <h2>{t("الآراء للمراجعة", "Avis à modérer")}</h2>
      {!q.reviews.length && (
        <p>{t("ما كاين حتى رأي جديد.", "Aucun avis en attente.")}</p>
      )}
      {q.reviews.map((r) => (
        <ActionForm
          key={r.id}
          action={triage.bind(null, l, r.id)}
          className="panel"
        >
          <strong>
            {q.profiles.find((p) => p.id === r.profile)?.revision.name}
          </strong>
          <p>
            ★ {r.rating} · {r.comment}
          </p>
          <div className="buttons">
            <button name="decision" value="approved">
              {t("نشر الرأي", "Publier l’avis")}
            </button>
            <button className="alt" name="decision" value="rejected">
              {t("رفض", "Refuser")}
            </button>
          </div>
        </ActionForm>
      ))}
      <h2>{t("الحرف والمناطق", "Métiers et territoires")}</h2>
      <CatalogManager l={l} items={items} />
    </section>
  );
}
