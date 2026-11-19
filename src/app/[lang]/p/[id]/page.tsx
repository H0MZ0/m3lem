import { cache } from "react";
import { notFound } from "next/navigation";
import { catalog, locale, rpc, demo } from "@/lib/server";
import { tr, scalar, nameOf, qs, uuid, type Detail } from "@/lib/model";
import { seo } from "@/lib/seo";
import {
  Facts,
  Badge,
  Coverage,
  Contact,
  Icon,
} from "@/features/discovery/directory";
import { Photo } from "@/features/profiles/photo";
import { ActionForm } from "@/features/accounts/form";
import { report } from "@/features/moderation/actions";
type Props = PageProps<"/[lang]/p/[id]">;
const detail = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const p = await rpc<Detail | null>("artisan_detail", {
    target: id,
    show_demo: demo(),
  });
  if (!p) notFound();
  return p;
});
export async function generateMetadata({ params }: Props) {
  const { lang, id } = await params,
    l = locale(lang),
    p = await detail(id);
  return seo(l, `/p/${id}`, p.name, p.services, !p.demo);
}
export default async function Profile({ params, searchParams }: Props) {
  const { lang, id } = await params,
    l = locale(lang),
    [p, items, q] = await Promise.all([detail(id), catalog(), searchParams]),
    t = (a: string, b: string) => tr(l, a, b),
    trade = p.trades.includes(scalar(q.trade)) ? scalar(q.trade) : "",
    area =
      items.find((i) => i.parent === p.city && i.slug === scalar(q.area))
        ?.slug ?? "";
  return (
    <section className="narrow">
      <p>
        <a
          href={
            `/${l}/city/${p.city}/${trade || "all"}` +
            qs({
              area,
              today: q.today === "1" ? "1" : "",
              page: scalar(q.page),
            })
          }
        >
          {t("رجع للنتائج", "Retour aux résultats")}
        </a>
      </p>
      <div className="profile panel">
        <span className="avatar">
          <Icon slug={p.trades[0]} />
        </span>
        <small>{p.trades.map((s) => nameOf(items, s, l)).join(" · ")}</small>
        <h1>{p.name}</h1>
        <p>
          <Coverage p={p} l={l} items={items} />
        </p>
        <Badge p={p} l={l} />
        <Facts p={p} l={l} />
        <h2>{t("الخدمات", "Services")}</h2>
        <p>{p.services}</p>
        <h2>{t("التواصل", "Contact")}</h2>
        {p.phone && !demo() && (
          <p>
            <bdi>{p.phone}</bdi>
          </p>
        )}
        {p.verified && (
          <p>{t("الإدارة أكدت النمرة", "Numéro confirmé par l’équipe")}</p>
        )}
        <Contact {...{ p, l, items, trade, area, local: demo() }} />
        <small>
          {t(
            "التواصل ماشي حجز. تقدر تصيفط صور ولا صوت من واتساب.",
            "Contacter ne réserve pas une intervention. Photos et notes vocales peuvent être envoyées sur WhatsApp.",
          )}
        </small>
      </div>
      {!!p.gallery.length && (
        <section>
          <h2>{t("من الخدمة ديالي", "Réalisations")}</h2>
          <div className="gallery">
            {p.gallery.map((id, i) => (
              <Photo key={id} {...{ id, l, n: i + 1, name: p.name }} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>{t("آراء الزبناء", "Avis clients")}</h2>
        {p.reviews.length ? (
          p.reviews.map((r, i) => (
            <blockquote key={i}>
              <bdi>★ {r.rating}/5</bdi>
              <p>{r.comment}</p>
            </blockquote>
          ))
        ) : (
          <p>
            {t(
              "باقي ما كاين حتى رأي منشور.",
              "Aucun avis publié pour le moment.",
            )}
          </p>
        )}
      </section>
      <details className="panel">
        <summary>{t("بلّغ على مشكل", "Signaler un problème")}</summary>
        <ActionForm action={report.bind(null, l, id)} className="stack">
          <label>
            {t(
              "شنو المشكل فالبروفايل ولا النمرة؟",
              "Quel est le problème avec la fiche ou le contact ?",
            )}
            <textarea name="reason" minLength={3} maxLength={500} required />
          </label>
          <button>{t("صيفط التبليغ", "Envoyer le signalement")}</button>
        </ActionForm>
      </details>
    </section>
  );
}
