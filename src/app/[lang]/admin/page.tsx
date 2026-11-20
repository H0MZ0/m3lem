import Image from "next/image";
import { access, locale, rpc, catalog } from "@/lib/server";
import {
  nameOf,
  tr,
  stateName,
  type Queue,
  type RequestQueueItem,
  type RequestSummary,
} from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { CatalogManager } from "@/features/catalog/pickers";
import { Photo } from "@/features/profiles/photo";
import { RevisionDiff } from "@/features/moderation/revision-diff";
import type { Summary } from "@/features/discovery/metrics";
import { moderate, issue, triage } from "@/features/moderation/actions";
import { triageRequest } from "@/features/requests/actions";
export default async function Admin({ params }: PageProps<"/[lang]/admin">) {
  const l = locale((await params).lang);
  await access(l, true);
  const [q, items, stats, requests, requestStats] = await Promise.all([
      rpc<Queue>("staff_queue"),
      catalog(true),
      rpc<Summary>("discovery_summary"),
      rpc<RequestQueueItem[]>("request_queue"),
      rpc<RequestSummary>("request_summary"),
    ]),
    t = (a: string, b: string) => tr(l, a, b);
  const panel = (p: Queue["profiles"][number]) => {
    const r = p.revision;
    return (
      <details className="panel" key={p.id}>
        <summary>
          {r.name} · {stateName(p.state, l)}
        </summary>
        {p.previous && (
          <RevisionDiff previous={p.previous} next={r} l={l} items={items} />
        )}
        <p>{r.services}</p>
        <p>
          {[...r.trades, r.city].map((s) => nameOf(items, s, l)).join(" · ")} ·{" "}
          {r.fee ?? "—"} MAD
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
  };
  const pending = q.profiles.filter((p) => p.state === "pending");
  return (
    <section className="narrow">
      <h1>{t("الإدارة", "Administration")}</h1>
      <h2>
        {t("البروفايلات اللي خاصها مراجعة", "Fiches à examiner")} ·{" "}
        {pending.length}
      </h2>
      {pending.length ? (
        pending.map(panel)
      ) : (
        <p>
          {t(
            "ما كاين حتى بروفايل كيتسنى المراجعة.",
            "Aucune fiche en attente.",
          )}
        </p>
      )}
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
      <h2>
        {t("طلبات الخدمة", "Demandes de service")} · {requestStats.open}
      </h2>
      {!requests.length && (
        <p>{t("ما كاين حتى طلب مفتوح.", "Aucune demande ouverte.")}</p>
      )}
      {requests.map((r) => (
        <details className="panel" key={r.id}>
          <summary>
            {r.name} · {nameOf(items, r.trade, l)} · {nameOf(items, r.city, l)}{" "}
            · <bdi>{r.ref}</bdi>
            {r.expired ? " · " + t("سالا", "Expirée") : ""}
          </summary>
          <p>{r.description}</p>
          <p>
            <bdi>{r.phone}</bdi> ·{" "}
            {new Date(r.created_at).toLocaleString("fr-MA", {
              timeZone: "Africa/Casablanca",
            })}
          </p>
          {!!r.photos.length && (
            <div className="gallery request-photos">
              {r.photos.map((id, i) => (
                <Image
                  key={id}
                  unoptimized
                  width={480}
                  height={320}
                  className="photo"
                  src={`/request-media/${id}`}
                  alt={t(
                    `تصويرة من الطلب · ${i + 1}`,
                    `Photo de la demande · ${i + 1}`,
                  )}
                />
              ))}
            </div>
          )}
          <p>
            {t("تسجيلات التواصل", "Contacts enregistrés")} :{" "}
            <b>{r.responses}</b>
          </p>
          {!!r.responders.length && (
            <ul>
              {r.responders.map((x, i) => (
                <li key={i}>
                  {x.name} ·{" "}
                  {new Date(x.at).toLocaleString("fr-MA", {
                    timeZone: "Africa/Casablanca",
                  })}
                </li>
              ))}
            </ul>
          )}
          <ActionForm
            action={triageRequest.bind(null, l, r.id)}
            className="stack"
          >
            <div className="buttons">
              <button name="decision" value="close">
                {t("سد الطلب", "Clore la demande")}
              </button>
              <button className="danger" name="decision" value="remove">
                {t("حيّد الطلب والتصاور", "Retirer la demande et les photos")}
              </button>
            </div>
          </ActionForm>
        </details>
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
      <h2>{t("باقي البروفايلات", "Autres fiches artisan")}</h2>
      {q.profiles.filter((p) => p.state !== "pending").map(panel)}
      <h2>{t("الحرف والمناطق", "Métiers et territoires")}</h2>
      <CatalogManager l={l} items={items} />
      <details className="panel">
        <summary>
          {t(
            "البحث والتواصل · آخر 30 يوم",
            "Recherche et contacts · 30 derniers jours",
          )}
        </summary>
        <p>
          {t("عمليات بحث مفهومة", "Recherches reconnues")} : {stats.searches} ·{" "}
          {t("بلا نتائج", "Sans résultat")} : {stats.empty}
        </p>
        <p>
          {t("ضغطات الاتصال", "Clics appel")} : {stats.calls} · WhatsApp :{" "}
          {stats.whatsapp}
        </p>
        <p>
          {t("طلبات آخر 30 يوم", "Demandes sur 30 jours")} :{" "}
          {requestStats.last30} ·{" "}
          {t("تواصل عليها حرفي", "Avec au moins un contact")} :{" "}
          {requestStats.responded} ·{" "}
          {t("مجموع التسجيلات", "Contacts enregistrés")} :{" "}
          {requestStats.responses}
        </p>
        <p>
          {t("متوسط الوقت لأول تسجيل", "Délai moyen du premier contact")} :{" "}
          {requestStats.avg_minutes === null
            ? "—"
            : `${requestStats.avg_minutes} ${t("دقيقة", "min")}`}
        </p>
        <small>
          {t(
            "ضغطات فقط، ماشي حجوزات. الديمو ما كيتحسبش.",
            "Ce sont des clics, pas des rendez-vous. La démo est exclue.",
          )}
        </small>
        {!!stats.gaps.length && (
          <>
            <h3>{t("فين خاص معلّمين", "Où recruter")}</h3>
            <ul>
              {stats.gaps.map((g) => (
                <li key={g.city + ":" + g.trade}>
                  {nameOf(items, g.city, l)} ·{" "}
                  {g.trade
                    ? nameOf(items, g.trade, l)
                    : t("جميع الحرف", "Tous métiers")}{" "}
                  : {g.misses}
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </section>
  );
}
