import Image from "next/image";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { catalog, locale, rpc } from "@/lib/server";
import { nameOf, requestStateName, tr, type RequestStatus } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { closeRequest } from "@/features/requests/actions";
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/request/[token]">) {
  const l = locale((await params).lang);
  return {
    title: tr(l, "حالة الطلب", "État de la demande"),
    robots: { index: false, follow: false },
  };
}
export default async function Status({
  params,
}: PageProps<"/[lang]/request/[token]">) {
  const { lang, token } = await params,
    l = locale(lang);
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const [r, items] = await Promise.all([
    rpc<RequestStatus | null>("request_status", {
      token_hash: createHash("sha256").update(token).digest("hex"),
    }),
    catalog(),
  ]);
  if (!r) notFound();
  const open = r.state === "open";
  return (
    <section className="narrow">
      <p>
        <a href={`/${l}/request`}>
          {tr(l, "صيفط طلب آخر", "Envoyer une autre demande")}
        </a>
      </p>
      <h1>
        {tr(l, "الطلب", "Demande")} <bdi>{r.ref}</bdi>
      </h1>
      <p>
        <span className={open ? "badge" : "problem"}>
          {requestStateName(r.state, l)}
        </span>
      </p>
      <div className="panel stack">
        <p>
          <b>{nameOf(items, r.trade, l)}</b> · {nameOf(items, r.city, l)}
        </p>
        <p>{r.description}</p>
        {!!r.photos.length && (
          <div className="gallery">
            {r.photos.map((id, i) => (
              <Image
                key={id}
                unoptimized
                width={480}
                height={320}
                className="photo"
                src={`/request-media/${id}?token=${token}`}
                alt={tr(
                  l,
                  `تصويرة من الطلب · ${i + 1}`,
                  `Photo de la demande · ${i + 1}`,
                )}
              />
            ))}
          </div>
        )}
        <p>
          {tr(l, "الزبون", "Client")} : {r.name} ·{" "}
          {tr(l, "صيفط فـ", "Envoyée le")}{" "}
          <bdi>
            {new Date(r.created_at).toLocaleString("fr-MA", {
              timeZone: "Africa/Casablanca",
            })}
          </bdi>
        </p>
        <p>
          <b>{r.responses}</b>{" "}
          {tr(
            l,
            "حرفي(ين) سجلو بلي تواصلو معاك.",
            "artisan(s) ont enregistré un contact.",
          )}
        </p>
        <small>
          {tr(
            l,
            "هاد الرقم كيسجل غير الضغط على «تم التواصل»، ماشي ضمان أن الحرفي عيّط. ما كاين حتى خلاص فمعلّم.",
            "Ce nombre compte les clics sur « J’ai contacté », pas une preuve d’appel. Aucun paiement ne passe par M3lem.",
          )}
        </small>
        {open ? (
          <>
            <p>
              {tr(
                l,
                "الطلب كيبان للحرفيين المنشورين فهاد المدينة والصنعة حتى",
                "La demande reste visible aux artisans publiés de cette ville et de ce métier jusqu’au",
              )}{" "}
              <bdi>
                {new Date(r.expires_at).toLocaleString("fr-MA", {
                  timeZone: "Africa/Casablanca",
                })}
              </bdi>
              .
            </p>
            <ActionForm action={closeRequest.bind(null, l, token)}>
              <button className="alt">
                {tr(l, "سد الطلب", "Clôturer la demande")}
              </button>
            </ActionForm>
          </>
        ) : (
          <p>
            {r.state === "expired"
              ? tr(
                  l,
                  "الطلب سالا. صيفط طلب جديد إلا مازال محتاج.",
                  "La demande a expiré. Envoyez-en une nouvelle si besoin.",
                )
              : r.state === "removed"
                ? tr(
                    l,
                    "الإدارة حيّدات هاد الطلب.",
                    "L’équipe a retiré cette demande.",
                  )
                : tr(
                    l,
                    "هاد الطلب تسد. ما بقاش كيبان للحرفيين.",
                    "Cette demande est clôturée et n’apparaît plus aux artisans.",
                  )}
          </p>
        )}
        <p>
          <a href={`/${l}/city/${r.city}/${r.trade}`}>
            {tr(
              l,
              "شوف الحرفيين فهاد المدينة",
              "Voir les artisans de cette ville",
            )}
          </a>
        </p>
      </div>
    </section>
  );
}
